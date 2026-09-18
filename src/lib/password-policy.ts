import { z } from "zod";

const COMMON_PASSWORDS = new Set([
  "password123!",
  "changeme123!",
  "admin123456!",
  "qwerty123456!",
  "123456789012!",
]);

export function getPasswordPolicyError(password: string, email?: string | null): string | null {
  if (password.length < 12) return "كلمة المرور يجب ألا تقل عن 12 حرفًا";
  if (password.length > 128) return "كلمة المرور تتجاوز الحد الأقصى المسموح";
  if (!/[A-Z]/.test(password)) return "كلمة المرور يجب أن تحتوي حرفًا إنجليزيًا كبيرًا";
  if (!/[a-z]/.test(password)) return "كلمة المرور يجب أن تحتوي حرفًا إنجليزيًا صغيرًا";
  if (!/\d/.test(password)) return "كلمة المرور يجب أن تحتوي رقمًا واحدًا على الأقل";
  if (!/[^A-Za-z0-9]/.test(password)) return "كلمة المرور يجب أن تحتوي رمزًا خاصًا واحدًا على الأقل";
  if (/\s/.test(password)) return "كلمة المرور لا يجب أن تحتوي مسافات";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "كلمة المرور شائعة وغير مسموح بها";

  const localPart = email?.trim().toLowerCase().split("@")[0];
  if (localPart && localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
    return "كلمة المرور لا يجب أن تحتوي اسم حساب المستخدم";
  }
  return null;
}

export const strongPasswordSchema = z
  .string()
  .min(12)
  .max(128)
  .superRefine((password, ctx) => {
    const error = getPasswordPolicyError(password);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  });
