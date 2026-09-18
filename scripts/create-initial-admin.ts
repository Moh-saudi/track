import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getPasswordPolicyError } from "../src/lib/password-policy";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const fullName = process.env.INITIAL_ADMIN_NAME?.trim() || "مدير المنظومة";
  const employer = process.env.INITIAL_ADMIN_EMPLOYER?.trim() || "رئاسة مجلس الوزراء";

  if (!email || !password) {
    throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required");
  }

  const passwordError = getPasswordPolicyError(password, email);
  if (passwordError) throw new Error(passwordError);

  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, active: true },
    select: { id: true, email: true },
  });

  if (existingAdmin) {
    throw new Error(
      `Active ADMIN already exists (${existingAdmin.email}). Bootstrap is intentionally one-time only.`
    );
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) throw new Error("The requested admin email already exists");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: UserRole.ADMIN,
      employer,
      active: true,
    },
    select: { id: true, email: true, fullName: true, role: true },
  });

  console.log(`Initial administrator created: ${user.email}`);
  console.log("Remove INITIAL_ADMIN_PASSWORD from the environment immediately.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
