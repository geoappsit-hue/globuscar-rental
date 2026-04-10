import { ContractData, OutputFormat } from '@/types';
import { google } from 'googleapis';
import { getGoogleAuth } from './google-sheets';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

// Format date to DD.MM.YYYY
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // If already in DD.MM.YYYY format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
  // If ISO format
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

// Calculate end date
function addDays(dateStr: string, days: number): string {
  const [dd, mm, yyyy] = dateStr.split('.');
  const date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  date.setDate(date.getDate() + days);
  return formatDate(date.toISOString());
}

// Build template variables from contract data
export function buildTemplateVars(data: ContractData): Record<string, string> {
  const startDate = formatDate(data.rental.startDate);
  const endDate = addDays(startDate, data.rental.durationDays);

  return {
    // Contract info
    CONTRACT_NUMBER: data.rental.contractNumber,
    CONTRACT_DATE: startDate,
    CONTRACT_DATE_GEO: startDate.replace(/\./g, '.') + '\u10EC.',  // Georgian date suffix

    // Car data
    CAR_BRAND_MODEL: `${data.car.brand} ${data.car.model}`.toUpperCase(),
    CAR_PLATE: data.car.plateNumber,
    CAR_VIN: data.car.vin,
    CAR_YEAR: data.car.year,
    CAR_COLOR: data.car.techPassportColor || data.car.color,
    CAR_TECH_PASSPORT: data.car.techPassportNumber,

    // Client data
    CLIENT_NAME: data.client.fullNameEn || data.client.fullName,
    CLIENT_BIRTH_DATE: formatDate(data.client.birthDate),
    CLIENT_PASSPORT: data.client.passportNumber,
    CLIENT_PASSPORT_ISSUED: formatDate(data.client.passportIssuedDate),
    CLIENT_PASSPORT_VALID: formatDate(data.client.passportValidUntil),
    CLIENT_PASSPORT_ISSUED_BY: data.client.passportIssuedBy,
    CLIENT_PHONE: data.client.phone,

    // Rental conditions
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

    // Landlord data (constant)
    LANDLORD_NAME: 'Khmiadashvili Nikolay',
    LANDLORD_COMPANY: 'P/E KHMIADASHVILI NIKOLAY',
    LANDLORD_ID: '405290466',
    LANDLORD_ADDRESS: 'Грузия, Пекина д. 7, кв. 20',
    LANDLORD_ADDRESS_GEO: 'საქართველო, თბილისი, პეკინის გამზირი ს. 7, ბინა. 20',
    LANDLORD_ACCOUNT: 'GE62BG0000000101492734GEL',
    LANDLORD_EMAIL: 'grade-4b@ya.ru',
    LANDLORD_PHONE: '+995599125743',
  };
}

// Generate Google Docs contract
export async function generateGoogleDoc(data: ContractData): Promise<string> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  const vars = buildTemplateVars(data);

  // Copy the template document
  const templateDocId = '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';
  const fileName = `Договор ${vars.CONTRACT_NUMBER} - ${vars.CLIENT_NAME} - ${vars.CAR_BRAND_MODEL}`;

  const copy = await drive.files.copy({
    fileId: templateDocId,
    requestBody: {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    },
  });

  const newDocId = copy.data.id!;

  // Build replacement requests
  const requests = Object.entries(vars).map(([key, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${key}}}`,
        matchCase: true,
      },
      replaceText: value || '',
    },
  }));

  // Also replace the hardcoded values from the template
  const hardcodedReplacements = [
    { from: 'GOLOD TIMOFEI', to: vars.CLIENT_NAME },
    { from: '04/0155', to: vars.CONTRACT_NUMBER },
    { from: '09.04.2025', to: vars.START_DATE },
    { from: 'FORD BRONCO', to: vars.CAR_BRAND_MODEL },
    { from: 'PH913PP', to: vars.CAR_PLATE },
    { from: '1FMDE5BH1NLB64197', to: vars.CAR_VIN },
    { from: '2022', to: vars.CAR_YEAR },
    { from: 'GREEN', to: vars.CAR_COLOR },
    { from: 'AJA7538667', to: vars.CAR_TECH_PASSPORT },
    { from: '20.09.1998', to: vars.CLIENT_BIRTH_DATE },
    { from: 'RUS 77 0642165', to: vars.CLIENT_PASSPORT },
    { from: '27.06.2023', to: vars.CLIENT_PASSPORT_ISSUED },
    { from: '27.06.2033', to: vars.CLIENT_PASSPORT_VALID },
    { from: 'МВД 78003', to: vars.CLIENT_PASSPORT_ISSUED_BY },
    { from: '+79215885778', to: vars.CLIENT_PHONE },
    { from: '4 сутки', to: `${vars.DURATION_DAYS} сутки` },
    { from: '4 დღეღამის', to: `${vars.DURATION_DAYS} დღეღამის` },
    { from: '300  USD', to: `${vars.TOTAL_RENT}  USD` },
    { from: '100$', to: `${vars.DEPOSIT}$` },
  ];

  const hardcodedRequests = hardcodedReplacements.map(({ from, to }) => ({
    replaceAllText: {
      containsText: {
        text: from,
        matchCase: true,
      },
      replaceText: to,
    },
  }));

  await docs.documents.batchUpdate({
    documentId: newDocId,
    requestBody: {
      requests: [...requests, ...hardcodedRequests],
    },
  });

  return `https://docs.google.com/document/d/${newDocId}/edit`;
}

// Generate DOCX using template
export async function generateDocx(data: ContractData): Promise<Buffer> {
  const vars = buildTemplateVars(data);

  // Read the DOCX template
  const templatePath = path.join(process.cwd(), 'templates', 'contract-template.docx');

  let content: Buffer;
  if (fs.existsSync(templatePath)) {
    content = fs.readFileSync(templatePath);
  } else {
    // Fallback: generate from scratch using simple DOCX
    return generateSimpleDocx(data, vars);
  }

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(vars);

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return buf;
}

// Fallback: Generate a simple DOCX programmatically
async function generateSimpleDocx(data: ContractData, vars: Record<string, string>): Promise<Buffer> {
  // For now, we'll export the Google Doc as DOCX
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  // First generate Google Doc, then export as DOCX
  const docUrl = await generateGoogleDoc(data);
  const docId = docUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];

  if (!docId) throw new Error('Failed to create Google Doc');

  const response = await drive.files.export(
    {
      fileId: docId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

// Generate PDF by exporting Google Doc as PDF
export async function generatePdf(data: ContractData): Promise<Buffer> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  // First generate Google Doc
  const docUrl = await generateGoogleDoc(data);
  const docId = docUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];

  if (!docId) throw new Error('Failed to create Google Doc');

  const response = await drive.files.export(
    {
      fileId: docId,
      mimeType: 'application/pdf',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}
