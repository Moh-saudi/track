-- Migration: إضافة رقم الهاتف والرقم القومي وكلمة المرور الأولية لجدول المستخدمين
-- لتمكين إرسال بيانات الدخول مباشرةً عبر الواتساب دون الحاجة لكتابة كلمة المرور في كل مرة

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "nationalId" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "initialPassword" TEXT;
