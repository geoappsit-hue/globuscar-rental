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

// Column mapping based on actual sheet structure (A=0, B=1, ...)
// Sheet columns: A=ID, B=Марка, C=Модель, D=Гос.номер,
//   E=Номер техпаспорта, F=Тип номера, G=Год, H=Цвет, I=Тип кузова,
//   J=Топливо, K=КПП, L=Привод, M=Дверей, N=Мест, O=Объем двиг.,
//   P=Мощность, Q=Расход, R=Бак, S=Руль, T=Депозит, U=Франшиза,
//   V=Кат.прав., W=Салон, X=Климат, Y=Крыша, Z=Круиз,
//   AA=Камера, AB=Парктроник, AC=ABS, AD=EBD, AE=ESP, AF=Подушки,
//   AG=Лимит км/день, AH=Примечание, AI=VIN, AJ=Цвет из техпаспорта,
//   AK=URL фото обложки, AL=URL фото галереи
const COL = {
  ID: 0, BRAND: 1, MODEL: 2, PLATE: 3,
  TECH_PASSPORT: 4,  // E — Номер техпаспорта
  PLATE_TYPE: 5,     // F — Тип номера ('гос' | 'транзит')
  YEAR: 6, COLOR: 7, BODY_TYPE: 8, FUEL: 9, TRANSMISSION: 10,
  DRIVE: 11, DOORS: 12, SEATS: 13, ENGINE_VOL: 14, POWER: 15,
  CONSUMPTION: 16, TANK: 17, STEERING: 18, DEPOSIT: 19, FRANCHISE: 20,
  LICENSE_CAT: 21, INTERIOR: 22, CLIMATE: 23, ROOF: 24, CRUISE: 25,
  CAMERA: 26, PARKTRONIC: 27, ABS: 28, EBD: 29, ESP: 30,
  AIRBAGS: 31, KM_LIMIT: 32, NOTE: 33, VIN: 34,
  TECH_COLOR: 35,        // AJ — Цвет из техпаспорта
  COVER_PHOTO_URL: 36,   // AK — URL фото обложки
  GALLERY_PHOTO_URL: 37, // AL — URL фото галереи
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
    plateType: get(COL.PLATE_TYPE),
  };
}

export async function getCars(): Promise<Car[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: 'Лист1!A2:AL',  // Skip header row
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
