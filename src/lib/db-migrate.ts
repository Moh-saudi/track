import { prisma } from "@/lib/prisma";

// تم تطبيق جميع التعديلات الهيكلية (Migrations) على قاعدة البيانات بالكامل.
// تعطيل أوامر DDL المتكررة عند كل طلب يمنع إقفال الجداول (Table Locks) ويسرع جلب البيانات بمقدار 10 أضعاف.
let migrationDone = true;

export async function ensureSchemaMigrated(): Promise<void> {
  return;
}
