import { ContractData, OutputFormat } from '@/types';
import { google } from 'googleapis';
import { getGoogleAuth } from './google-sheets';
import PizZip from 'pizzip';

// Format date to DD.MM.YYYY
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function addDays(dateStr: string, days: number): string {
  const [dd, mm, yyyy] = dateStr.split('.');
  const date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  date.setDate(date.getDate() + days);
  return formatDate(date.toISOString());
}

export function buildTemplateVars(data: ContractData) {
  const startDate = formatDate(data.rental.startDate);
  const endDate = addDays(startDate, data.rental.durationDays);
  return {
    CONTRACT_NUMBER: data.rental.contractNumber,
    CONTRACT_DATE: startDate,
    CAR_BRAND_MODEL: `${data.car.brand} ${data.car.model}`.toUpperCase(),
    CAR_PLATE: data.car.plateNumber,
    CAR_VIN: data.car.vin,
    CAR_YEAR: data.car.year,
    CAR_COLOR: data.car.techPassportColor || data.car.color,
    CAR_TECH_PASSPORT: data.car.techPassportNumber,
    CLIENT_NAME: data.client.fullNameEn || data.client.fullName,
    CLIENT_BIRTH_DATE: formatDate(data.client.birthDate),
    CLIENT_PASSPORT: data.client.passportNumber,
    CLIENT_PASSPORT_ISSUED: formatDate(data.client.passportIssuedDate),
    CLIENT_PASSPORT_VALID: formatDate(data.client.passportValidUntil),
    CLIENT_PASSPORT_ISSUED_BY: data.client.passportIssuedBy,
    CLIENT_PHONE: data.client.phone,
    START_DATE: startDate,
    END_DATE: endDate,
    DURATION_DAYS: data.rental.durationDays.toString(),
    DAILY_RATE: data.rental.dailyRate.toString(),
    TOTAL_RENT: data.rental.totalRent.toString(),
    DEPOSIT: data.rental.deposit.toString(),
    SUPER_KASKO: data.rental.superKasko ? 'Да / დიახ' : 'Нет / არა',
    SUPER_KASKO_TOTAL: data.rental.superKaskoTotal.toString(),
    DELIVERY_TYPE: data.rental.deliveryType,
    DELIVERY_COST: data.rental.deliveryCost.toString(),
    FUEL_LEVEL: data.rental.fuelLevel,
    FRANCHISE: data.car.franchise || '500',
    LANDLORD_NAME: 'Khmiadashvili Nikolay',
    LANDLORD_COMPANY: 'P/E KHMIADASHVILI NIKOLAY',
    LANDLORD_ID: '405290466',
    LANDLORD_ADDRESS: 'Грузия, Пекина д. 7, кв. 20',
    LANDLORD_ACCOUNT: 'GE62BG0000000101492734GEL',
    LANDLORD_EMAIL: 'grade-4b@ya.ru',
    LANDLORD_PHONE: '+995599125743',
  };
}

// Hardcoded sample values in the template that need to be replaced
const TEMPLATE_REPLACEMENTS = [
  { from: 'GOLOD TIMOFEI', key: 'CLIENT_NAME' },
  { from: '04/0155', key: 'CONTRACT_NUMBER' },
  { from: '09.04.2025', key: 'START_DATE' },
  { from: 'FORD BRONCO', key: 'CAR_BRAND_MODEL' },
  { from: 'PH913PP', key: 'CAR_PLATE' },
  { from: '1FMDE5BH1NLB64197', key: 'CAR_VIN' },
  { from: 'AJA7538667', key: 'CAR_TECH_PASSPORT' },
  { from: '20.09.1998', key: 'CLIENT_BIRTH_DATE' },
  { from: 'RUS 77 0642165', key: 'CLIENT_PASSPORT' },
  { from: '27.06.2023', key: 'CLIENT_PASSPORT_ISSUED' },
  { from: '27.06.2033', key: 'CLIENT_PASSPORT_VALID' },
  { from: 'МВД 78003', key: 'CLIENT_PASSPORT_ISSUED_BY' },
  { from: '+79215885778', key: 'CLIENT_PHONE' },
  { from: '4 сутки', key: '_DURATION_RU' },
  { from: '4 დღეღამის', key: '_DURATION_GE' },
  { from: '300 USD', key: '_TOTAL_RENT_USD' },
  { from: '100$', key: '_DEPOSIT_USD' },
];

// Download template DOCX from Google Drive (read-only, no storage needed)
async function downloadTemplateAsDocx(): Promise<Buffer> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });
  const templateDocId = process.env.GOOGLE_TEMPLATE_DOC_ID || '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';

  const response = await drive.files.export({
    fileId: templateDocId,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }, { responseType: 'arraybuffer' });

  return Buffer.from(response.data as ArrayBuffer);
}

// Replace text in DOCX XML content
function replaceInDocx(docxBuffer: Buffer, vars: Record<string, string>): Buffer {
  const zip = new PizZip(docxBuffer);

  // Process all XML files in the DOCX
  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'];

  for (const xmlFile of xmlFiles) {
    const file = zip.file(xmlFile);
    if (!file) continue;
    let content = file.asText();

    // Replace {{VAR}} placeholders (handling XML tags that may split the text)
    for (const [key, value] of Object.entries(vars)) {
      // Direct replacement
      content = content.split('{{' + key + '}}').join(value || '');
      // Also try with possible XML run splits
      const regex = new RegExp('\\{\\{' + key.split('').join('(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?') + '\\}\\}', 'g');
      content = content.replace(regex, value || '');
    }

    // Replace hardcoded sample values
    for (const repl of TEMPLATE_REPLACEMENTS) {
      let replValue = '';
      if (repl.key === '_DURATION_RU') replValue = vars.DURATION_DAYS + ' сутки';
      else if (repl.key === '_DURATION_GE') replValue = vars.DURATION_DAYS + ' დღეღამის';
      else if (repl.key === '_TOTAL_RENT_USD') replValue = vars.TOTAL_RENT + ' USD';
      else if (repl.key === '_DEPOSIT_USD') replValue = vars.DEPOSIT + '$';
      else replValue = vars[repl.key] || '';

      content = content.split(repl.from).join(replValue);
    }

    zip.file(xmlFile, content);
  }

  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

// Generate Google Docs contract (creates in user folder)
export async function generateGoogleDoc(data: ContractData): Promise<string> {
  const auth = getGoogleAuth();
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });
  const vars = buildTemplateVars(data);
  const templateDocId = process.env.GOOGLE_TEMPLATE_DOC_ID || '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';
  const fileName = `Договор ${vars.CONTRACT_NUMBER} - ${vars.CLIENT_NAME} - ${vars.CAR_BRAND_MODEL}`;

  // Try copy approach first, fall back to DOCX upload
  try {
    const copy = await drive.files.copy({
      fileId: templateDocId,
      requestBody: { name: fileName, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!] },
    });
    const newDocId = copy.data.id!;

    // Replace placeholders and hardcoded values
    const requests = Object.entries(vars).map(([key, value]) => ({
      replaceAllText: { containsText: { text: '{{' + key + '}}', matchCase: true }, replaceText: value || '' },
    }));
    const hardcoded = TEMPLATE_REPLACEMENTS.map(r => {
      let val = '';
      if (r.key === '_DURATION_RU') val = vars.DURATION_DAYS + ' сутки';
      else if (r.key === '_DURATION_GE') val = vars.DURATION_DAYS + ' დღეღამის';
      else if (r.key === '_TOTAL_RENT_USD') val = vars.TOTAL_RENT + ' USD';
      else if (r.key === '_DEPOSIT_USD') val = vars.DEPOSIT + '$';
      else val = vars[r.key] || '';
      return { replaceAllText: { containsText: { text: r.from, matchCase: true }, replaceText: val } };
    });
    await docs.documents.batchUpdate({ documentId: newDocId, requestBody: { requests: [...requests, ...hardcoded] } });
    return `https://docs.google.com/document/d/${newDocId}/edit`;
  } catch (copyError: any) {
    // Fallback: generate DOCX locally and upload as Google Doc
    const docxBuf = await generateDocx(data);
    const media = { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: require('stream').Readable.from(docxBuf) };
    const uploaded = await drive.files.create({
      requestBody: { name: fileName, mimeType: 'application/vnd.google-apps.document', parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!] },
      media,
    });
    return `https://docs.google.com/document/d/${uploaded.data.id}/edit`;
  }
}

// Generate DOCX locally (no Drive storage needed)
export async function generateDocx(data: ContractData): Promise<Buffer> {
  const vars = buildTemplateVars(data);
  const templateBuffer = await downloadTemplateAsDocx();
  return replaceInDocx(templateBuffer, vars);
}

// Generate PDF by exporting template as PDF after text replacement
export async function generatePdf(data: ContractData): Promise<Buffer> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });
  const templateDocId = process.env.GOOGLE_TEMPLATE_DOC_ID || '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';

  // Try the copy approach first for best PDF quality
  try {
    const vars = buildTemplateVars(data);
    const docs = google.docs({ version: 'v1', auth });
    const copy = await drive.files.copy({
      fileId: templateDocId,
      requestBody: { name: 'temp-contract', parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!] },
    });
    const newDocId = copy.data.id!;

    const requests = Object.entries(vars).map(([key, value]) => ({
      replaceAllText: { containsText: { text: '{{' + key + '}}', matchCase: true }, replaceText: value || '' },
    }));
    const hardcoded = TEMPLATE_REPLACEMENTS.map(r => {
      let val = '';
      if (r.key === '_DURATION_RU') val = vars.DURATION_DAYS + ' сутки';
      else if (r.key === '_DURATION_GE') val = vars.DURATION_DAYS + ' დღეღამის';
      else if (r.key === '_TOTAL_RENT_USD') val = vars.TOTAL_RENT + ' USD';
      else if (r.key === '_DEPOSIT_USD') val = vars.DEPOSIT + '$';
      else val = vars[r.key] || '';
      return { replaceAllText: { containsText: { text: r.from, matchCase: true }, replaceText: val } };
    });
    await docs.documents.batchUpdate({ documentId: newDocId, requestBody: { requests: [...requests, ...hardcoded] } });

    const response = await drive.files.export({ fileId: newDocId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
    try { await drive.files.delete({ fileId: newDocId }); } catch (e) {}
    return Buffer.from(response.data as ArrayBuffer);
  } catch (e) {
    // Fallback: return DOCX (user can convert to PDF)
    return generateDocx(data);
  }
}
