export interface Car {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  year: string;
  color: string;
  bodyType: string;
  fuel: string;
  transmission: string;
  drive: string;
  doors: string;
  seats: string;
  engineVolume: string;
  power: string;
  consumption: string;
  tankVolume: string;
  steering: string;
  deposit: string;
  franchise: string;
  licenseCategory: string;
  interior: string;
  climate: string;
  roof: string;
  cruise: string;
  camera: string;
  parktronic: string;
  abs: string;
  ebd: string;
  esp: string;
  airbags: string;
  kmLimit: string;
  note: string;
  vin: string;
  techPassportNumber: string;
  techPassportColor: string;
  photoUrl: string;
  galleryPhotoUrl: string;
}

export interface ClientData {
  fullName: string;
  fullNameEn: string;
  birthDate: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
  passportValidUntil: string;
  phone: string;
  email: string;
}

export interface RentalConditions {
  contractNumber: string;
  startDate: string;
  durationDays: number;
  dailyRate: number;
  deposit: number;
  fuelLevel: string;
  insuranceType: string;      // kasko | super_kasko | full_coverage
  insuranceDailyRate: number; // cost per day (for super_kasko / full_coverage)
  insuranceTotal: number;     // insuranceDailyRate * durationDays
  deliveryType: string;
  deliveryCost: number;
  deliveryLocation: string;  // human-readable location name for template
  returnType: string;        // selected return option key
  returnLocation: string;    // human-readable return location for template
  returnCost: number;        // return cost
  totalRent: number;
  additionalNotes: string;
}

export interface LocationOption {
  value: string;   // row number "1"-"6" or "other"
  label: string;   // display name
  cost: number;    // price (0 for "Другое")
}

export interface ContractData {
  client: ClientData;
  car: Car;
  rental: RentalConditions;
}

export type OutputFormat = 'docx' | 'pdf' | 'gdocs';
