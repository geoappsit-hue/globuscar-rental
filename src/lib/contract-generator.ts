import { ContractData } from '@/types';
import { google } from 'googleapis';
import { getGoogleAuth } from './google-sheets';
import PizZip from 'pizzip';
import { Readable } from 'stream';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('.');
  if (parts.length !== 3) return dateStr;
  const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
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
    CAR_VIN: data.car.vin || '',
    CAR_YEAR: data.car.year,
    CAR_COLOR: data.car.techPassportColor || data.car.color,
    CAR_TECH_PASSPORT: data.car.techPassportNumber || '',
    CLIENT_NAME: data.client.fullNameEn || data.client.fullName,
    CLIENT_BIRTH_DATE: formatDate(data.client.birthDate),
    CLIENT_PASSPORT: data.client.passportNumber,
    CLIENT_PASSPORT_ISSUED: formatDate(data.client.passportIssuedDate),
    CLIENT_PASSPORT_VALID: formatDate(data.client.passportValidUntil),
    CLIENT_PASSPORT_ISSUED_BY: data.client.passportIssuedBy || '',
    CLIENT_PHONE: data.client.phone,
    START_DATE: startDate,
    END_DATE: endDate,
    DURATION_DAYS: data.rental.durationDays.toString(),
    DAILY_RATE: data.rental.dailyRate.toString(),
    TOTAL_RENT: data.rental.totalRent.toString(),
    DEPOSIT: data.rental.deposit.toString(),
    SUPER_KASKO: data.rental.superKasko ? 'Да / დიახ' : 'Нет / არა',
    SUPER_KASKO_TOTAL: data.rental.superKaskoTotal.toString(),
    DELIVERY_TYPE: data.rental.deliveryType || '',
    DELIVERY_COST: data.rental.deliveryCost.toString(),
    FUEL_LEVEL: data.rental.fuelLevel || '',
    FRANCHISE: data.car.franchise || '500',
  };
}

// Simple text replacement in XML - replace directly in XML content
function replaceTextInXml(xml: string, replacements: [string, string][]): string {
  let result = xml;
  for (const [from, to] of replacements) {
    if (from && result.includes(from)) {
      result = result.split(from).join(to || '');
    }
  }
  return result;
}

// Download template as DOCX from Google Drive (read-only, no storage needed)
async function downloadTemplateAsDocx(): Promise<Buffer> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });
  const templateDocId = process.env.GOOGLE_TEMPLATE_DOC_ID || '1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o';
  const response = await drive.files.export({
    fileId: templateDocId,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }, { responseType: 'arraybuffer' });
  const buf = Buffer.from(response.data as ArrayBuffer);
  if (buf.length < 100 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error('Template download failed: not a valid DOCX/ZIP file (' + buf.length + ' bytes)');
  }
  return buf;
}

// Replace text in all DOCX XML parts
function replaceInDocx(docxBuffer: Buffer, vars: Record<string, string>): Buffer {
  const zip = new PizZip(docxBuffer);
  const replacements: [string, string][] = Object.entries(vars).map(([key, value]) => ['{{' + key + '}}', value || '']);

  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'];

  for (const xmlFile of xmlFiles) {
    const file = zip.file(xmlFile);
    if (!file) continue;
    let content = file.asText();
    content = replaceTextInXml(content, replacements);
    zip.file(xmlFile, content);
  }

  return Buffer.from(zip.generate({ type: 'uint8array', compression: 'DEFLATE' }));
}

// Generate DOCX locally (no Drive storage needed)
export async function generateDocx(data: ContractData): Promise<Buffer> {
  const vars = buildTemplateVars(data);
  const templateBuffer = await downloadTemplateAsDocx();
  return replaceInDocx(templateBuffer, vars);
}

// Generate Google Docs - hybrid approach:
// 1. Service account downloads template as DOCX (has read access)
// 2. OAuth2 user uploads DOCX to their Drive as Google Doc (drive.file scope is enough for new uploads)
// 3. Docs API applies text replacements
export async function generateGoogleDoc(data: ContractData): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const docs = google.docs({ version: 'v1', auth: oauth2Client });
  const vars = buildTemplateVars(data);
  const fileName = `Договор ${vars.CONTRACT_NUMBER} - ${vars.CLIENT_NAME} - ${vars.CAR_BRAND_MODEL}`;

  // Step 1: Download template as DOCX using service account (has read access)
  const templateBuffer = await downloadTemplateAsDocx();

  // Step 2: Upload DOCX to OAuth user's Drive, converting to Google Doc format
  const uploadResult = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/vnd.google-apps.document',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: Readable.from(templateBuffer),
    },
  });
  const newDocId = uploadResult.data.id!;

  // Step 3: Apply text replacements via Docs API
  const requests = Object.entries(vars).map(([key, value]) => ({
    replaceAllText: { containsText: { text: '{{' + key + '}}', matchCase: true }, replaceText: value || '' },
  }));
  await docs.documents.batchUpdate({ documentId: newDocId, requestBody: { requests } });
  return `https://docs.google.com/document/d/${newDocId}/edit`;
}

// Generate PDF - export DOCX as PDF is not possible locally, so return DOCX with notice
export async function generatePdf(data: ContractData): Promise<Buffer> {
  // Since service account has 0 Drive storage, we cannot use Google Docs for PDF conversion
  // Generate DOCX instead - the API route should handle the format appropriately
  return generateDocx(data);
}
