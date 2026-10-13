# سجل تتبع ومعالجة المشكلات التقنية (Issue & Incident Tracker)
## اللجنة العليا للمسؤولية الطبية — منظومة تتبع القضايا والسجلات

تم إنشاء هذا المستند ليكون المرجع الرسمي الموثق لرصد أي مشكلة أو خلل يطرأ على النظام، وتحليل أسبابها الجذرية، وتوثيق طرق معالجتها وحالة تنفيذها خطوة بخطوة بالترتيب.

---

### جدول متابعة المشكلات العام (Summary Matrix)

| كود المشكلة | عنوان المشكلة | مستوى الخطورة | تاريخ الرصد | الحالة الحالية | الملفات المعنية |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **ISSUE-001** | انقطاع الجلسة المفاجئ وظهور خطأ `401 غير مصرح` في Heartbeat وتقارير القيد | **حرج (Critical)** | 2026-10-12 | 🟢 تم الحل والتطبيق | `src/lib/auth.ts`<br>`src/lib/prisma.ts`<br>`src/app/api/...` |
| **ISSUE-002** | فشل فحص أمان الحزم في الـ CI/CD (`npm audit --audit-level=high`) بسبب ثغرات `sharp` و `source-map-js` | **عالي (High)** | 2026-10-12 | 🟢 تم الحل والتطبيق | `package.json`<br>`package-lock.json` |
| **ISSUE-003** | خطأ `An error occurred in the Server Components render` و `Node cannot be found` عند الربط مع سوبابيز (Supabase) | **حرج (Critical)** | 2026-10-12 | 🟢 تم الحل والتحصين | صفحات الـ Dashboard<br>مسبح اتصالات Supabase |
| **FEATURE-004** | تمييز أرقام القضايا والمحاضر عن رقم السجل الداخلي في صفحة التوجيه + لوحة التقارير الموحدة + البحث الفوري بالهيدر | **تطوير وتحديث إجرائي** | 2026-10-12 | 🟢 تم الإنجاز والنشر | `follow-up/page.tsx`<br>`reports/page.tsx`<br>`GlobalSearchBar.tsx`<br>`TopBar.tsx`<br>`Sidebar.tsx` |
| **ISSUE-005** | خطأ `Minified React error #306` وتعذر تصيير واجهة الداشبورد من حين لآخر بعد التحديثات | **متوسط (Medium)** | 2026-10-13 | 🟢 تم الحل والتحصين التلقائي | `src/app/dashboard/error.tsx`<br>كاش المتصفح وحزم الـ Chunks |

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

---

### 【ISSUE-003】خطأ معالجة مكونات الخادم (`Server Components render`) وانهيار Hydration مع Supabase

#### 1. توصيف المشكلة والأعراض المسجلة (Reported Symptoms):
عند فتح لوحات التحكم في بيئة الإنتاج على Vercel والمربوطة بقاعدة بيانات سوبابيز (Supabase)، تظهر شاشة الخطأ المؤقت وتُسجل في كونسول المتصفح الرسائل التالية:
```text
Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
Dashboard render error: Error: An error occurred in the Server Components render...
Node cannot be found in the current page
```

---

#### 2. التحليل الجذري للسبب (Root Cause Analysis):
1. **استخدام مسبح اتصالات Supabase Transaction Pooler (Port 6543) بدون إعداد Prisma:**
   - يوفر Supabase نمطين للاتصال: المنفذ المباشر `5432`، ومنفذ مسبح الاتصالات السريعة `6543` (المعتمد على pgBouncer / Supavisor).
   - نمط الـ Transaction Pooler (المنفذ 6543) **لا يدعم Prepared Statements**.
   - محرك Prisma بشكل افتراضي ينشئ Prepared Statements لجميع الاستعلامات.
   - في حال كان رابط `DATABASE_URL` يشير إلى المنفذ `6543` دون إضافة المعامل `?pgbouncer=true`، يرفض بوستجرس الاستعلام فوراً بخطأ: `ERROR: prepared statement "s0" does not exist`.
   - خادم Next.js في الإنتاج يقوم بتعتيم هذا الخطأ لحماية بيانات قاعدة البيانات ويستبدله بالرسالة:
     `An error occurred in the Server Components render. The specific message is omitted in production builds...` ثم ينقله لـ `src/app/dashboard/error.tsx`.

2. **استنفاد سعة اتصالات Supabase في الـ Serverless (Pool Exhaustion):**
   - بيئة Vercel تشغل دوال Serverless متعددة بالتوازي. إذا كان الرابط يفتقر إلى `&connection_limit=1`، فإن Prisma يفتح مسبح اتصالات متعدد لكل دالة، مما يؤدي سريعاً لتجاوز الحد الأقصى لسوبابيز (15-20 اتصال في الخطط العادية) ورفض الاتصالات الجديدة.

3. **غياب كتل الحماية `try ... catch` والتعامل الآمن مع التواريخ في صفحات الـ Server Components:**
   - صفحات لوحات التحكم (`subcommittee`, `supreme`, `finance`, `admin/audit-logs`, `admin/active-users`, `admin/risk-mode`) كانت تنفذ استعلامات `Promise.all` دون `try ... catch`.
   - عند حدوث أي تأخر لحظي في شبكة Supabase، كان الخطأ يسقط المكون بالكامل بدلاً من إرجاع مصفوفات فارغة واستمرار عمل الواجهة بأمان.
   - استدعاء `c.createdAt.toISOString()` مباشرة دون التحقق من صلاحية التاريخ كان يرمي `RangeError: Invalid time value`.

4. **سبب خطأ `Node cannot be found in the current page`:**
   - عندما يفشل الـ Server Component في الخادم، يرسل Next.js تدفق HTML يحتوي على واجهة الخطأ `DashboardError`.
   - أثناء عملية الـ Hydration في المتصفح عبر React 18/19، عند محاولة استبدال شجرة الـ DOM، أو عند تفعيل الترجمة التلقائية للمتصفح (Google Translate) للنصوص العربية والتي تعيد هيكلة عناصر النصوص، يفشل React في الوصول للعقد الأصلية ويرمي استثناء `NotFoundError: Node cannot be found in the current page`.

---

#### 3. خطة وطرق الحل المعتمدة (Proposed Solutions & Fixes):

- [x] **تحصين كافة صفحات الـ Server Components بـ `try ... catch` وهيكلة استعادة آمنة:**
   - تعديل صفحات `subcommittee` و `supreme` و `finance` و `audit-logs` و `active-users` و `risk-mode` و `follow-up`.
   - تغليف كافة استعلامات `prisma.*` بكتل حماية ترجع مصفوفات فارغة افتراضية عند حدوث بطء أو انقطاع لحظي في قاعدة البيانات دون إسقاط الصفحة.
   - استخدام دالة تحويل آمنة للتواريخ `safeIsoDate()` تمنع انهيار التحويل إلى ISO.

- [x] **ضبط وتوثيق إعدادات اتصال Supabase الصحيحة في Vercel و `.env`:**
   - **في حال استخدام Transaction Pooler (المنفذ 6543 - الموصى به لـ Vercel):**
     يجب أن يحتوي الرابط في متغيرات البيئة على المعاملين التاليين إلزامياً:
     ```text
     DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
     ```
   - **في حال استخدام Session Pooler أو Direct (المنفذ 5432):**
     يجب إضافة محدد الاتصالات الفردي لمنع استنزاف السعة:
     ```text
     DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?connection_limit=1"
     ```

---

#### 4. حالة التنفيذ (Implementation Status):
- **الحالة:** 🟢 **تم تحصين وحماية كافة مكونات الخادم وتوافق البناء بنجاح**.

---

### 【FEATURE-004】فصل أرقام القضايا عن القيد الداخلي + لوحة التقارير والداشبورد الموحدة + البحث الفوري المفهرس

#### 1. توصيف المطلب والتحديثات الإجرائية (Requirements):
1. **صفحة التوجيه (`/dashboard/follow-up`):** كان الجدول يعرض عموداً وحيداً `رقم السجل / السنة` يحتوي على المسلسل والعام فقط (مثل `1 / 2026`)، دون إظهار رقم القضية أو المحضر أو الشكوى الوارد من النيابة لسنة كذا.
2. **لوحة القيادة الموحدة وجرافات المراحل (`/dashboard/reports`):** عدم وجود لوحة تقارير مركزية تجمع مسار دورة حياة القضايا من القيد حتى القرار النهائي بجرافات لكل مرحلة.
3. **تفعيل حقل البحث في الهيدر:** تشغيل حقل البحث السريع الفوري في الهيدر العلوي عبر كافة الحقول لتسهيل الوصول المباشر لكافة السجلات.

---

#### 2. الحلول والتحسينات المنفذة (Implemented Solutions):

1. **فصل الأعمدة في شاشة التوجيه والمتابعة (`follow-up`):**
   - إضافة عمود **`رقم القضية / المحضر`**: يعرض رقم القضية أو المحضر الخارجي المسجل (`prosecutionCaseNumber`) مع سنته.
   - إضافة عمود **`رقم السجل الداخلي`**: يعرض مسلسل القيد الداخلي الخاص بالمنظومة (`#caseNumber / caseYear`) مع رابط مباشر لملف القضية.
   - تطبيق ذلك في جدولي "السجلات بانتظار التوجيه" و"مرصد مدد اللجان الفرعية" ونافذة إلغاء التوجيه.

2. **إنشاء صفحة التقارير ولوحة القيادة الموحدة (`/dashboard/reports`):**
   - **الصلاحيات:** إتاحة الصفحة للأدوار القيادية والرقابية (`ADMIN`, `SUPREME_COMMITTEE`, `FOLLOW_UP_OFFICER`, `RISK_OFFICER`).
   - **قمع المراحل الخمس (Pipeline Funnel):** تتبع مرئي لكافة المراحل (1. القيد والوارد ⬅️ 2. فحص اللجان الفرعية ⬅️ 3. مداولة اللجنة العليا ⬅️ 4. القرارات المعتمدة ⬅️ مسار إعادة الدراسة).
   - **مؤشرات الأداء الكبرى (KPIs):** الوارد العام، نسب الإنجاز، ومعدلات الاعتماد.
   - **جرافات بيانية:** جراف الالتزام الزمني (SLA)، جراف مواقف المسؤولية الطبية (ثبوت خطأ / انتفاء / استيفاء)، جراف التخصصات الأكثر طلباً، جدول أداء اللجان الـ 16، وجراف النيابات.
   - **فلاتر ذكية وتصدير:** فلترة بالسنة والنوع واللجنة والمرحلة، مع زري طباعة فورية وتصدير CSV/Excel.

3. **تفعيل محرك البحث السريع الشامل (`GlobalSearchBar`):**
   - البحث المفهرس في كافة الحقول: رقم السجل، رقم المحضر، الشاكي، المشكو في حقه، المستشفى، والنيابة.
   - إضافة مسار API خفيف وسريع: `/api/cases/search`.
   - اختصار لوحة المفاتيح <kbd>Ctrl</kbd> + <kbd>K</kbd> وقائمة منسدلة تفاعلية مع تنقل بالأسهم واختيار مباشر بـ <kbd>Enter</kbd>.

---

#### 3. حالة التنفيذ (Implementation Status):
- **الحالة:** 🟢 **تم التنفيذ بالكامل واجتياز اختبار البناء (`npm run build`) بنجاح تام.**

---

### 【ISSUE-005】خطأ `Minified React error #306` وانهيار تصيير لوحات التحكم من حين لآخر

#### 1. توصيف المشكلة والأعراض المسجلة (Reported Symptoms):
يظهر في كونسول المتصفح لدى المستخدمين في بيئة الإنتاج من حين لآخر الخطأ التالي، مما يؤدي إلى توجيه الصفحة إلى شاشة `تعذر تحميل هذه الصفحة مؤقتًا`:
```text
1255-5cd2fe06309409a0.js:1 Error: Minified React error #306; visit https://react.dev/errors/306?args[]=%5Bobject%20Object%5D&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
    at oq (4bd1b696-f785427dddbba9fb.js:1:81237)
    at ik (4bd1b696-f785427dddbba9fb.js:1:114677)
    at 4bd1b696-f785427dddbba9fb.js:1:114522
    at ib (4bd1b696-f785427dddbba9fb.js:1:114530)
    at iu (4bd1b696-f785427dddbba9fb.js:1:111613)
    at iX (4bd1b696-f785427dddbba9fb.js:1:132929)
    at MessagePort.w (1255-5cd2fe06309409a0.js:1:114974)
Dashboard render error: Error: Minified React error #306...
```

---

#### 2. التحليل الجذري للسبب (Root Cause Analysis):
من خلال فك تشفير كود خطأ React 18/19 رقم **306** من كود مصدر React الرسمي:
> **`Element type is invalid. Received a promise that resolves to: [object Object]. Lazy element type must resolve to a class or function.`**

السبب الرئيسي لحدوث هذا الخطأ **من حين لآخر (Intermittently)** في الإنتاج:
1. **تعارض كاش المتصفح مع النشر الجديد (Stale Dynamic Chunks after Deployments):**
   - عندما تكون جلسة المستخدم مفتوحة في المتصفح ويتم نشر كود جديد على Vercel أو الخادم، تتغير هاشات حزم الـ JavaScript الناتجة عن البناء (مثلاً تغير هاش الحزمة `1255-5cd2fe06309409a0.js` إلى `1255-fc6c00ab2f765339.js`).
   - عند قيام المستخدم بالتنقل الداخلي (`next/link`) بين الصفحات أو فتح مكوّن يتم تحميله كحزمة كسولة، يطلب المتصفح ملف الهاش القديم المخزن في ذاكرته.
   - يستجيب الخادم إما بصفحة HTML 404 أو توجيه، فيقوم محمل الحزم بحل الـ Promise إلى كائن عام (`[object Object]`) بدلاً من دالة مكون React.
   - عند محاولة محرك React Fiber تصيير المكوّن ذي الوسم (Tag 16: `LazyComponent`)، يكتشف أن الناتج ليس دالة أو فئة، فيرمي خطأ 306.
   - عند قيام المستخدم بتحديث الصفحة يدوياً (`F5`)، يجلب المتصفح الهاشات الجديدة فوراً ويعمل النظام بشكل طبيعي.

2. **تعثر مؤقت في تدفق Server Components (RSC Flight Stream Blip):**
   - في حال تعثر استعلام لحظي أو إرجاع استجابة غير مهيكلة من الخادم أثناء التنقل السريع، تُرجع الـ Promise كائن خطأ بدلاً من العقد البرمجية.

---

#### 3. خطة وطرق الحل المعتمدة (Proposed Solutions & Fixes):
- [x] **تزويد شاشة الخطأ `src/app/dashboard/error.tsx` بآلية استعادة تلقائية فورية (Smart Self-Healing):**
  - فحص نوع الخطأ عند وقوعه؛ فإذا كان الخطأ متعلقاً بـ `Minified React error #306` أو `ChunkLoadError`، يقوم المكون تلقائياً وبشكل صامت بإجراء تحديث فوري للصفحة لمرة واحدة عبر `window.location.reload()`.
  - تخزين حالة المحاولة في `sessionStorage` لمنع حدوث حلقات تحديث لا نهائية (Infinite Loops).
  - هذا يضمن تنظيف الكاش وجلب الحزم المحدثة فوراً دون أن يرى المستخدم أي شاشة تعطل.
- [x] **التأكد من التوافق البرمجي التام لجميع الـ Server Components والـ Client Components:**
  - اجتياز اختبار `npm run typecheck` بنجاح كامل بدون أي أخطاء استيراد.
  - اجتياز اختبار `npm run build` بنجاح وتوليد كافة المسارات الـ 30.

---

#### 4. حالة التنفيذ (Implementation Status):
- **الحالة:** 🟢 **تم التحصين والحل البرمجي وتوثيق الحالة بنجاح تام.**

---

### 【ISSUE-006】عدم حفظ وتحديث أسماء وبيانات المستخدمين من خلال شاشة إدارة المستخدمين

#### 1. توصيف المشكلة والأعراض المسجلة (Reported Symptoms):
عند قيام مسؤول النظام (Admin) بالدخول إلى شاشة إدارة المستخدمين والصلاحيات (`/dashboard/admin/users`) وتعديل الاسم الكامل أو بيانات أي مستخدم (أو تعديل حسابه الشخصي)، يلاحظ عدم انعكاس الاسم الجديد في الجدول أو فشل التعديل دون إشعار واضح.

---

#### 2. التحليل الجذري للسبب (Root Cause Analysis):
تم فحص مسار التعديل بالكامل من واجهة العميل وحتى قاعدة البيانات والتوكن، وتبيّن وجود أربعة أسباب متراكبة:
1. **حظر تعديل الحساب الشخصي للمدير في مسار الـ API (`/api/admin/users/[id]`):**
   - كان مسار الـ API يحتوي على شرط صارم: `if ((session.user as any).id === id) return 400;` ("لا يمكن تعديل حسابك الشخصي من هنا"). هذا الشرط كان يمنع المدير تماماً من تعديل اسمه أو هاتفه أو جهة عمله من نفس الجدول.
2. **فشل التحقق (Zod Validation) وتحوله إلى كائن خطأ غير مقروء:**
   - مخطط التحقق `updateSchema` كان يفحص حقول `nationalId` و `phone` بدون استثناء النصوص الفارغة، مما يتسبب في رفض التحقق.
   - في حال فشل التحقق، كان المسار يرجع `{ error: parsed.error.flatten() }`، وعند قراءته في واجهة العميل كان يتحول إلى خطأ `[object Object]` بدلاً من رسالة عربية واضحة.
3. **غياب الحالة التفاعلية المحلية (Local Reactive State) في جدول العميل:**
   - كان مكوّن `AdminUsersTable` يعتمد مباشرة على الخاصية الممررة `users` من الخادم ويستدعي `router.refresh()`. في بيئة Next.js App Router، تحديث الموجه يكون غير متزامن ويتأثر بكاش التوجيه، مما يؤدي لعدم تحديث الاسم في الجدول فور إغلاق النافذة المنبثقة.
4. **عدم مزامنة الاسم المحدث مع جلسة المستخدم (NextAuth JWT Token):**
   - في دالة استعلام التحقق من الجلسة `jwt` بملف `auth.ts`، كان حقل `fullName` غير محدد ضمن `select` عند إعادة الفحص، وبالتالي لم يكن اسم المدير في الشريط العلوي يتغير حتى بعد تسجيل الخروج وإعادة الدخول.

---

#### 3. المعالجات والتحسينات المعتمدة (Implemented Solutions):
- [x] **تحديث مسار الـ API (`src/app/api/admin/users/[id]/route.ts`):**
  - السماح لمدير المنظومة بتعديل بياناته الشخصية (الاسم، جهة العمل، الهاتف، الرقم القومي)، مع الحفاظ التام على قيود الأمان الأساسية (عدم السماح للمدير بتعطيل حسابه الشخصي أو سحب صفة الإدارة عن نفسه).
  - ضبط التحقق من صحة الرقم القومي ورقم الهاتف المصري في مخطط `zod` مع تحسين صيغة إرجاع رسائل الخطأ لتكون نصوصاً عربية واضحة ومباشرة.
- [x] **تحديث جدول المستخدمين بالواجهة (`src/app/dashboard/admin/users-table.tsx`):**
  - إضافة حالة تفاعلية محلية `usersList` ومزامنتها تلقائياً مع خاصية `users` باستخدام `useEffect`.
  - تحديث بيانات المستخدم المحدث فورياً ولحظياً في `usersList` عند نجاح استجابة الحفظ، مما ينعكس على الفور في الجدول دون الحاجة لانتظار إعادة تحميل الصفحة.
  - تحسين معالجة استخراج رسائل الخطأ في واجهة العميل لمنع ظهور `[object Object]`.
- [x] **مزامنة جلسة المستخدم واسمه في الشريط العلوي (`src/lib/auth.ts`):**
  - جلب حقل `fullName` وتحديث `token.name` و `session.user.name` تلقائياً لضمان تطابق اسم المستخدم في الهيدر والملف الشخصي فور التعديل.

---

#### 4. حالة التنفيذ (Implementation Status):
- **الحالة:** 🟢 **تم الحل الشامل، واجتياز اختبار TypeScript و `npm run build` بنجاح تام.**



