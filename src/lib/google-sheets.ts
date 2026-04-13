import { google } from 'googleapis';
import { Car, LocationOption } from '@/types';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/cloud-platform',
];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });
}

export function getGoogleAuth() {
  return getAuth();
}

// Column mapping: A=0, B=1, ..., AJ=35
const COL = {
  ID: 0, BRAND: 1, MODEL: 2, PLATE: 3, YEAR: 4, COLOR: 5,
  BODY_TYPE: 6, FUEL: 7, TRANSMISSION: 8, DRIVE: 9, DOORS: 10,
  SEATS: 11, ENGINE_VOL: 12, POWER: 13, CONSUMPTION: 14,
  TANK: 15, STEERING: 16, DEPOSIT: 17, FRANCHISE: 18,
  LICENSE_CAT: 19, INTERIOR: 20, CLIMATE: 21, ROOF: 22,
  CRUISE: 23, CAMERA: 24, PARKTRONIC: 25, ABS: 26, EBD: 27,
  ESP: 28, AIRBAGS: 29, KM_LIMIT: 30, NOTE: 31, VIN: 32,
  TECH_PASSPORT: 33, TECH_COLOR: 34, COVER_PHOTO_URL: 35, GALLERY_PHOTO_URL: 36,
};

function rowToCar(row: string[]): Car {
  const get = (idx: number) => row[idx] || '';
  return {
    id: get(COL.ID),
    brand: get(COL.BRAND),
    model: get(COL.MODEL),
    plateNumber: get(COL.PLATE),
    year: get(COL.YEAR),
    color: get(COL.COLOR),
    bodyType: get(COL.BODY_TYPE),
    fuel: get(COL.FUEL),
    transmission: get(COL.TRANSMISSION),
    drive: get(COL.DRIVE),
    doors: get(COL.DOORS),
    seats: get(COL.SEATS),
    engineVolume: get(COL.ENGINE_VOL),
    power: get(COL.POWER),
    consumption: get(COL.CONSUMPTION),
    tankVolume: get(COL.TANK),
    steering: get(COL.STEERING),
    deposit: get(COL.DEPOSIT),
    franchise: get(COL.FRANCHISE),
    licenseCategory: get(COL.LICENSE_CAT),
    interior: get(COL.INTERIOR),
    climate: get(COL.CLIMATE),
    roof: get(COL.ROOF),
    cruise: get(COL.CRUISE),
    camera: get(COL.CAMERA),
    parktronic: get(COL.PARKTRONIC),
    abs: get(COL.ABS),
    ebd: get(COL.EBD),
    esp: get(COL.ESP),
    airbags: get(COL.AIRBAGS),
    kmLimit: get(COL.KM_LIMIT),
    note: get(COL.NOTE),
    vin: get(COL.VIN),
    techPassportNumber: get(COL.TECH_PASSPORT),
    techPassportColor: get(COL.TECH_COLOR),
    photoUrl: get(COL.COVER_PHOTO_URL),
    galleryPhotoUrl: get(COL.GALLERY_PHOTO_URL),
  };
}

export async function getCars(): Promise<Car[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: 'Лист1!A2:AK',  // Skip header row
  });

  const rows = response.data.values || [];
  return rows
    .map(rowToCar)
    .filter(car => car.note?.toLowerCase().includes('готово')); // Only cars marked as ready
}

export async function getCarById(id: string): Promise<Car | null> {
  const cars = await getCars();
  return cars.find(car => car.id === id) || null;
}

export async function getLocationOptions(tab: 'Доставка' | 'Возврат'): Promise<LocationOption[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: `${tab}!A2:D20`,
  });
  const rows = response.data.values || [];
  return rows.map((row: string[]) => ({
    value: row[0] || '',       // № column
    label: row[1] || '',       // Наименование column
    cost: parseFloat(row[2]) || 0,  // Цена column
  }));
}
