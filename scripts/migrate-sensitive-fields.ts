import { PrismaClient } from "@prisma/client";
import { encryptOptionalField, isEncryptedField } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    throw new Error("FIELD_ENCRYPTION_KEY is required");
  }

  const doctors = await prisma.subCommitteeDoctor.findMany({
    select: {
      id: true,
      nationalId: true,
      accountNumber: true,
      iban: true,
      cardNumber: true,
    },
  });

  let updated = 0;
  for (const doctor of doctors) {
    const values = [doctor.nationalId, doctor.accountNumber, doctor.iban, doctor.cardNumber];
    const needsMigration = values.some((value) => value && !isEncryptedField(value));
    if (!needsMigration) continue;

    await prisma.subCommitteeDoctor.update({
      where: { id: doctor.id },
      data: {
        nationalId: encryptOptionalField(doctor.nationalId),
        accountNumber: encryptOptionalField(doctor.accountNumber),
        iban: encryptOptionalField(doctor.iban),
        cardNumber: encryptOptionalField(doctor.cardNumber),
      },
    });
    updated++;
  }

  console.log(`Sensitive-field migration complete. Updated ${updated} doctor record(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
