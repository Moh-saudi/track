import { decryptOptionalField } from "@/lib/crypto";

export function decryptDoctorSensitiveFields<T extends {
  nationalId?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  cardNumber?: string | null;
}>(doctor: T): T {
  return {
    ...doctor,
    nationalId: decryptOptionalField(doctor.nationalId) as T["nationalId"],
    accountNumber: decryptOptionalField(doctor.accountNumber) as T["accountNumber"],
    iban: decryptOptionalField(doctor.iban) as T["iban"],
    cardNumber: decryptOptionalField(doctor.cardNumber) as T["cardNumber"],
  };
}
