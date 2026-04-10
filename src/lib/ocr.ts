import { google } from 'googleapis';
import { ClientData } from '@/types';
import { getGoogleAuth } from './google-sheets';

interface OcrResult {
  success: boolean;
  data?: Partial<ClientData>;
  rawText?: string;
  error?: string;
}

export async function recognizePassport(imageBase64: string): Promise<OcrResult> {
  try {
    const auth = getGoogleAuth();
    const vision = google.vision({ version: 'v1', auth });

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await vision.images.annotate({
      requestBody: {
        requests: [
          {
            image: { content: base64Data },
            features: [
              { type: 'TEXT_DETECTION' },
              { type: 'DOCUMENT_TEXT_DETECTION' },
            ],
          },
        ],
      },
    });

    const annotations = response.data.responses?.[0];
    const fullText = annotations?.fullTextAnnotation?.text || '';

    if (!fullText) {
      return { success: false, error: 'No text detected in the image' };
    }

    const parsed = parsePassportText(fullText);

    return {
      success: true,
      data: parsed,
      rawText: fullText,
    };
  } catch (error: any) {
    console.error('OCR Error:', error);
    return {
      success: false,
      error: error.message || 'OCR processing failed',
    };
  }
}

function parsePassportText(text: string): Partial<ClientData> {
  const result: Partial<ClientData> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Try to extract full name (usually near "Surname" / "Given names" / after P< in MRZ)
  const mrzLine = lines.find(l => l.startsWith('P<'));
  if (mrzLine) {
    const mrzParts = mrzLine.replace(/^P<\w{3}/, '').split('<<');
    if (mrzParts.length >= 2) {
      const surname = mrzParts[0].replace(/</g, ' ').trim();
      const givenNames = mrzParts[1].replace(/</g, ' ').trim();
      result.fullNameEn = `${surname} ${givenNames}`.toUpperCase();
      result.fullName = result.fullNameEn;
    }
  }

  // Try to find name patterns in regular text
  if (!result.fullNameEn) {
    // Look for "Surname / Фамилия" pattern
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/surname|фамилия/i.test(line) && i + 1 < lines.length) {
        const surname = lines[i + 1].replace(/[^a-zA-Zа-яА-ЯёЁ\s-]/g, '').trim();
        if (surname) {
          result.fullNameEn = surname.toUpperCase();
        }
      }
      if (/given\s*name|имя/i.test(line) && i + 1 < lines.length) {
        const givenName = lines[i + 1].replace(/[^a-zA-Zа-яА-ЯёЁ\s-]/g, '').trim();
        if (givenName && result.fullNameEn) {
          result.fullNameEn += ' ' + givenName.toUpperCase();
          result.fullName = result.fullNameEn;
        }
      }
    }
  }

  // Extract passport number
  const passportPattern = /(\d{2}\s?\d{7})/;
  const passportMatch = text.match(passportPattern);
  if (passportMatch) {
    result.passportNumber = passportMatch[1].replace(/\s/g, '');
  }

  // Extract dates (DD.MM.YYYY or DD/MM/YYYY format)
  const datePattern = /(\d{2}[.\/]\d{2}[.\/]\d{4})/g;
  const dates = text.match(datePattern) || [];

  // Extract birth date from MRZ (second line) or regular text
  const mrzLine2 = lines.find(l => /^\d{7}[MFX<]/.test(l.replace(/\s/g, '')));
  if (mrzLine2) {
    const cleaned = mrzLine2.replace(/\s/g, '');
    const birthYY = cleaned.substring(0, 2);
    const birthMM = cleaned.substring(2, 4);
    const birthDD = cleaned.substring(4, 6);
    const year = parseInt(birthYY) > 30 ? '19' + birthYY : '20' + birthYY;
    result.birthDate = `${birthDD}.${birthMM}.${year}`;

    // Expiry date is at position 8-14
    const expYY = cleaned.substring(8, 10);
    const expMM = cleaned.substring(10, 12);
    const expDD = cleaned.substring(12, 14);
    const expYear = parseInt(expYY) > 30 ? '19' + expYY : '20' + expYY;
    result.passportValidUntil = `${expDD}.${expMM}.${expYear}`;
  }

  // Fallback: use detected dates
  if (!result.birthDate && dates.length > 0) {
    // Birth date is usually the earliest date
    const parsedDates = dates.map(d => {
      const [day, month, year] = d.split(/[.\/]/);
      return { original: d, date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)) };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (parsedDates.length >= 1) {
      result.birthDate = parsedDates[0].original;
    }
    if (parsedDates.length >= 2) {
      result.passportIssuedDate = parsedDates[1].original;
    }
    if (parsedDates.length >= 3) {
      result.passportValidUntil = parsedDates[2].original;
    }
  }

  // Try to find issuing authority
  const issuedByPatterns = [
    /(?:выдан|issued\s*by|authority)[:\s]*(.+)/i,
    /(?:МВД|MIA|MVD)[:\s]*(.+)/i,
  ];
  for (const pattern of issuedByPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.passportIssuedBy = match[1].trim();
      break;
    }
  }

  return result;
}
