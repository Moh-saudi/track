# سجل تتبع ومعالجة المشكلات التقنية (Issue & Incident Tracker)
## اللجنة العليا للمسؤولية الطبية — منظومة تتبع القضايا والسجلات

تم إنشاء هذا المستند ليكون المرجع الرسمي الموثق لرصد أي مشكلة أو خلل يطرأ على النظام، وتحليل أسبابها الجذرية، وتوثيق طرق معالجتها وحالة تنفيذها خطوة بخطوة بالترتيب.

---

### جدول متابعة المشكلات العام (Summary Matrix)

| كود المشكلة | عنوان المشكلة | مستوى الخطورة | تاريخ الرصد | الحالة الحالية | الملفات المعنية |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **ISSUE-001** | انقطاع الجلسة المفاجئ وظهور خطأ `401 غير مصرح` في Heartbeat وتقارير القيد | **حرج (Critical)** | 2026-10-12 | 🟢 تم الحل والتطبيق | `src/lib/auth.ts`<br>`src/lib/prisma.ts`<br>`src/app/api/...` |
| **ISSUE-002** | فشل فحص أمان الحزم في الـ CI/CD (`npm audit --audit-level=high`) بسبب ثغرات `sharp` و `source-map-js` | **عالي (High)** | 2026-10-12 | 🟢 تم الحل والتطبيق | `package.json`<br>`package-lock.json` |

---

## 📌 تفاصيل المشكلات المسجلة

### 【ISSUE-001】انقطاع الجلسة وظهور خطأ `401 غير مصرح` في الـ Heartbeat وتقارير القيد

#### 1. توصيف المشكلة والأعراض المسجلة (Reported Symptoms):
أثناء عمل موظفي القيد والتسجيل على المنظومة، تفشل بعض العمليات فجأة وتظهر رسائل الخطأ التالية في كونسول المتصفح (Developer Console):
```text
/api/user/heartbeat:1  Failed to load resource: the server responded with a status of 401 ()
/api/registration/reports?:1  Failed to load resource: the server responded with a status of 401 ()
page-8432348f0f56e50c.js:1 fetchReport error: Error: غير مصرح
```
ويتبع ذلك بعد فترة وجيزة طرد المستخدم تلقائياً إلى صفحة تسجيل الدخول `/login`.

---

#### 2. التحليل الجذري للسبب (Root Cause Analysis):
من خلال التتبع الدقيق للأكواد وآلية الاتصال بين خوادم Vercel وقاعدة بيانات Supabase، تم رصد **3 أسباب جذرية متزامنة**:

1. **إعادة التحقق من قاعدة البيانات مع كل طلب بدون حماية من أخطاء الاتصال (`jwt` Callback in `auth.ts`):**
   - في دالة `jwt` داخل [`src/lib/auth.ts`](file:///d:/case-tracking-system/case-tracking-system/src/lib/auth.ts)، يقوم النظام في كل طلب باستدعاء استعلام:
     `prisma.user.findUnique({ where: { id: token.id } })`
   - هذا الاستعلام كان يتم تنفيذه **بدون كتلة `try ... catch`**.
   - في حال حدوث أي تأخير لحظي في شبكة Supabase أو وصول مسبح الاتصالات للحد الأقصى (Pool Timeout / Network Hiccup)، يرمي الاستعلام خطأ غير مُعالج، مما يؤدي إلى فشل فك تشفير الجلسة وإرجاع `session.user = null`، فيرد الخادم بـ `401 غير مصرح` فوراً.

2. **عدم الاحتفاظ بمسبح اتصالات Prisma في بيئة الإنتاج (`src/lib/prisma.ts`):**
   - في ملف [`src/lib/prisma.ts`](file:///d:/case-tracking-system/case-tracking-system/src/lib/prisma.ts)، كان كود منع الاتصالات المتعددة محصوراً ببيئة التطوير فقط:
     ```typescript
     if (process.env.NODE_ENV !== "production") {
       globalForPrisma.prisma = prisma;
     }
     ```
   - هذا يجعل كل استدعاء سيرفرلس على Vercel ينشئ نسخة `PrismaClient` جديدة بمسبح اتصالات جديد، مما يستهلك سعة اتصالات Supabase بسرعة فائقة مسبباً إغلاق الاتصالات ورفض الطلبات المتزامنة.

3. **ضغط الاستعلامات المتكررة على الجلسة الواحدة (Lack of Session Verification Throttling):**
   - عند فتح صفحة تقارير القيد أو قيد سجل جديد، يرسل المتصفح عدة طلبات متوازية (Heartbeat + Reports + Prosecutions + Specialties).
   - كل طلب من هذه الطلبات يطلب فحص نفس المستخدم من قاعدة بيانات Supabase في نفس الثانية، مما يضاعف العبء 5-6 أضعاف دون حاجة، بينما الـ JWT مشفر وموقّع أمنياً بـ `NEXTAUTH_SECRET`.

---

#### 3. خطة وطرق الحل المعتمدة (Proposed Solutions & Fixes):

- [x] **الحل 1 (الصمود الأمني والـ Fallback في `src/lib/auth.ts`):**
  - تغليف استعلام التحقق من المستخدم بـ `try ... catch`.
  - في حال تعثر الاتصال المؤقت بقاعدة البيانات، لا يتم إبطال الجلسة ولا طرد المستخدم، بل يتم الاعتماد على بيانات الـ JWT الموقعة والمشفرة بالفعل ما دامت صالحة ولم تنتهِ مدتها.
  - إضافة آلية تخزين مؤقت للتحقق (Throttling بفاصل 30 ثانية) بحيث لا يُعاد الاستعلام عن بيانات نفس المستخدم من قاعدة البيانات مع كل طلب متزامن، مما يمنع إرهاق اتصالات Supabase.

- [x] **الحل 2 (تثبيت كائن Prisma عبر كافة البيئات في `src/lib/prisma.ts`):**
  - تعديل الكود ليعيد استخدام `globalForPrisma.prisma` دائماً في الإنتاج والتطوير معاً، لضمان استقرار الاتصالات وعدم استنفاد موارد Supabase في بيئة السيرفرلس (Vercel).

---

#### 4. حالة التنفيذ (Implementation Status):
- **الحالة:** 🟢 **تم التطبيق واجتياز الفحص البرمجي والنشر بنجاح على Vercel**.

---

### 【ISSUE-002】فشل فحص أمان الحزم في الـ GitHub Actions CI بسبب ثغرات `sharp` و `source-map-js` و `next`

#### 1. توصيف المشكلة والأعراض المسجلة (Reported Symptoms):
أثناء تشغيل خط أنابيب التحقق الأمني الحكومي (Government Security CI) في GitHub Actions:
```text
Run npm audit --omit=dev --audit-level=high
# npm audit report
next 15.0.0 - 15.5.26  Severity: moderate
sharp <0.35.5          Severity: high (GHSA-wq5f-xc86-pv6w)
source-map-js 1.0.0 - 1.2.1  Severity: high (GHSA-68fv-2mgg-jv7q)
3 vulnerabilities (1 moderate, 2 high)
Error: Process completed with exit code 1.
```
تسبب ذلك في إيقاف واعتراض الـ CI/CD وفشل خطوة `Dependency vulnerability audit`.

---

#### 2. التحليل الجذري للسبب (Root Cause Analysis):
1. حزمة `sharp` التابعة لمعالجة الصور كانت تحتوي على ثغرة أمنية في مكتبة `librsvg` (CVE-2026-96889) في الإصدارات الأقدم من `0.35.5`.
2. حزمة `source-map-js` التي تعتمد عليها حزم معالجة الـ CSS (`postcss`) كانت متوقفة عند الإصدار `1.2.1` الذي يحتوي على ثغرة Event-loop denial of service (GHSA-68fv-2mgg-jv7q).
3. إصدار Next.js الأساسي كان `15.5.24`، وتم إطلاق الإصدار المحصن `15.5.27` لسد ثغرات الـ SSG/ISR Cache Poisoning.

---

#### 3. خطة وطرق الحل المعتمدة (Proposed Solutions & Fixes):
- [x] ترقية `next` إلى الإصدار المحصن الأحدث `15.5.27` في `package.json`.
- [x] إضافة قواعد `overrides` صارمة في `package.json` تفرض استخدام النسخ الآمنة لجميع التبعيات الفرعية:
  - `"source-map-js": "1.2.2"`
  - `"sharp": "^0.35.5"`
- [x] تحديث `package-lock.json` وتوليد Prisma Client بنجاح.
- [x] إجراء الفحص المحلي بنفس أمر الـ CI: `npm audit --omit=dev --audit-level=high` والتأكد من إرجاع:
  `found 0 vulnerabilities` (Exit Code 0).
- [x] تشغيل اختبارات الأمان والـ Typecheck: `npm run typecheck` و `npm run test:security` وتأكيد النجاح (PASS).

---

#### 4. حالة التنفيذ (Implementation Status):
- **الحالة:** 🟢 **تم الحل وتصفير الثغرات واجتياز الفحص الأمني بالكامل**.
