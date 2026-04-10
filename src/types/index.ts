export interface Car {
  id: string;
  brand: string;        // Марка
  model: string;        // Модель
  plateNumber: string;  // Гос. номер
  year: string;         // Год
  color: string;        // Цвет
  bodyType: string;     // Тип кузова
  fuel: string;         // Топливо
  transmission: string; // КПП
  drive: string;        // Привод
  doors: string;        // Дверей
  seats: string;        // Мест
  engineVolume: string; // Объем двиг.
  power: string;        // Мощность (л.с.)
  consumption: string;  // Расход (л/100км)
  tankVolume: string;   // Бак (л)
  steering: string;     // Руль
  deposit: string;      // Депозит ($)
  franchise: string;    // Франшиза ($)
  licenseCategory: string; // Кат. прав.
  interior: string;     // Салон
  climate: string;      // Климат
  roof: string;         // Крыша
  cruise: string;       // Круиз
  camera: string;       // Камера
  parktronic: string;   // Парктроник
  abs: string;          // ABS
  ebd: string;          // EBD
  esp: string;          // ESP
  airbags: string;      // Подушки
  kmLimit: string;      // Лимит км/день
  note: string;         // Примечание
  vin: string;          // VIN
  techPassportNumber: string; // Номер техпаспорта
  techPassportColor: string;  // Цвет из техпаспорта
  photoUrl: string;     // URL фотообложки
}

export interface ClientData {
  fullName: string;         // ФИО
  fullNameEn: string;       // Full name in English (from passport)
  birthDate: string;        // Дата рождения
  passportNumber: string;   // Номер паспорта
  passportIssuedBy: string; // Кем выдан
  passportIssuedDate: string; // Дата выдачи
  passportValidUntil: string; // Действителен до
  phone: string;            // Телефон
  email: string;            // Email (optional)
}

export interface RentalConditions {
  contractNumber: string;   // Номер договора
  startDate: string;        // Дата начала
  durationDays: number;     // Срок аренды (суток)
  dailyRate: number;        // Стоимость аренды в сутки ($)
  totalRent: number;        // Итого за аренду ($)
  deposit: number;          // Депозит ($)
  superKasko: boolean;      // СуперКАСКО (20$/день)
  superKaskoTotal: number;  // Итого СуперКАСКО
  deliveryType: string;     // Тип доставки
  deliveryCost: number;     // Стоимость доставки
  fuelLevel: string;        // Уровень топлива при передаче
  additionalNotes: string;  // Дополнительные примечания
}

export interface ContractData {
  car: Car;
  client: ClientData;
  rental: RentalConditions;
}

export type OutputFormat = 'pdf' | 'docx' | 'gdocs';
