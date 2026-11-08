# 🏛️ نظام التصميم وهندسة الواجهات الموحدة (Design System Specification)
> **دليل تقني للمطورين لتوحيد قياسات الشاشات، الطباعة، الجداول، القوائم الجانبية، واستيعاب البيانات الضخمة.**

---

## 1. فلسفة التصميم (Design Philosophy & Content Density)

تم بناء هذا النظام ليخدم المنظومات الإدارية والحكومية المعقدة (Enterprise / Gov Platforms) التي تتطلب:
1. **الهدوء البصري الرسمي:** خلفيات محايدة هادئة (`#F8FAFC` / `slate-50`) تقلل إجهاد العين أثناء العمل اليومي الطويل.
2. **كثافة المعلومات المحسوبة (Information Density):** استيعاب أقصى قدر ممكن من البيانات بوضوح تام وبدون تشويش أو تكدس.
3. **فصل وظائف الخطوط:** 
   - **خط العناوين (`Cairo`):** قوي، رصين، ذو حضور واضح للفواصل والعناوين الإدارية.
   - **خط القراءة والجداول (`Tajawal`):** انسيابي، مريح، ذو مقروئية فائقة في النصوص الصغيرة والمتوسطة.
4. **حماية الواجهة من النصوص الطويلة:** استخدام قواعد ثبات الأبعاد (`shrink-0` للأيقونات، `truncate` للنصوص الطويلة، `whitespace-nowrap` للمسميات والأكواد).

---

## 2. نظام الخطوط والطباعة (Typography Scale & Hierarchy)

### أ. إعداد الخطوط عبر Google Fonts

يتم تضمين الخطوط في وسم `<head>` في ملف `layout.tsx`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link
  href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=Tajawal:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

### ب. جدول مصفوفة أحجام الخطوط واستخداماتها

| العنصر (Element) | نوع الخط (Family) | الحجم الفعلي (Size) | الوزن (Weight) | ارتفاع السطر (Line-Height) | الاستخدام ومجال الاستيعاب |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **عنوان الشاشة (Page Title / H1)** | `Cairo` | `text-2xl` إلى `text-3xl` (24px - 30px) | `font-bold` (700) | `leading-tight` (1.25) | عنوان الصفحة الرئيسي في أعلى كل صفحة |
| **عنوان القسم (Section Header / H2)** | `Cairo` | `text-base` إلى `text-lg` (16px - 18px) | `font-bold` (700) | `leading-snug` (1.35) | رؤوس البطاقات، الصناديق الرئيسية، والجداول |
| **عناوين فرعية داخلية (H3 / H4)** | `Cairo` | `text-sm` (14px) | `font-bold` (700) | `leading-normal` (1.5) | عناوين مجموعات الحقول والنوافذ المنبثقة |
| **نص المتن الأساسي (Body Default)** | `Tajawal` | `text-[15px]` | `font-normal` (400) | `leading-relaxed` (1.625) | نصوص الفقرات والشروحات والتعليمات العامة |
| **عناوين مجموعات القائمة الجانبية** | `Cairo` | `text-[11px]` | `font-bold` (700) | `tracking-wider` | فواصل الأقسام في القائمة الجانبية |
| **روابط القائمة الجانبية (Sidebar Items)** | `Tajawal` | `text-xs` (12px) | `font-medium` (500) | - | عناصر التنقل الجانبية مع أيقونة 20px |
| **رؤوس الجداول (Table Headers `<th>`)** | `Cairo` | `text-[11px]` | `font-bold` (700) | - | أسماء الأعمدة لمنع الالتباس |
| **بيانات خلايا الجداول (`<td>`)** | `Tajawal` | `text-xs` (12px) | `font-normal` أو `500` | `leading-normal` | قراءة محتويات الخلايا والأسماء والجهات |
| **الشارات الدلالية (Badges)** | `Tajawal` | `text-[11px]` (sm) / `text-xs` (md) | `font-medium` (500) | `whitespace-nowrap` | عرض الحالات والأكواد الإدارية |
| **الأرقام والأكواد والتواريخ (Monospace)** | `ui-monospace` | `font-mono text-xs` (12px) | `font-bold` أو `500` | - | أرقام القضايا، مبالغ الدفع، والتواريخ |

---

## 3. الهيكل العام للصفحة والقائمة الجانبية (Layout & Sidebar System)

### أ. القياسات الهندسية الشاملة
- **الشريط العلوي (TopBar):**
  - الارتفاع: `h-16` (64px) ثابت و `sticky top-0 z-30`.
  - الخلفية: `bg-white border-b border-slate-200 px-4 sm:px-6`.
  - المكونات: الشعار في اليمين، شريط بحث فوري في المنتصف (`max-w-md`)، وحساب المستخدم والإشعارات في اليسار.
- **القائمة الجانبية لسطح المكتب (Desktop Sidebar):**
  - العرض: `w-64` (256px) ثابت لا يتقلص `shrink-0`.
  - التثبيت: `sticky top-16 h-[calc(100vh-4rem)]` يمنح وصولاً دائماً أثناء تمرير الصفحة.
  - الخلفية: `bg-[#F7FAF9]` (أوف وايت هادئ مع ملمس طبي) مع `border-l border-slate-200`.
- **القائمة الجانبية للشاشات المحمولة (Mobile Drawer):**
  - العرض: `w-72 max-w-[85vw]` مع طبقة حجب `bg-slate-900/40 backdrop-blur-xs`.
- **حاوية المحتوى الرئيسي (Main Content Area):**
  - القياس: `flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-slate-50 overflow-y-auto`.
  - خاصية `min-w-0` إلزامية لمنع تمدد الصفحة أفقياً عند عرض جداول عريضة.

### ب. تصميم روابط ومجموعات القائمة الجانبية (Navigation Item Token)

```tsx
// 1. عنوان المجموعة الإدارية في القائمة (Group Label)
<div className="px-3 py-1 text-[11px] font-bold text-slate-600 tracking-wider font-heading">
  {groupName}
</div>

// 2. الرابط العادي (Inactive Link)
<Link
  href={item.href}
  className="group flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-all duration-150"
>
  <Icon className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors" />
  <span className="truncate">{item.label}</span>
</Link>

// 3. الرابط المفعل الحالي (Active Link)
<Link
  href={item.href}
  className="group flex items-center gap-3 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 border-r-[3px] border-r-teal-600 rounded-lg rounded-r-none shadow-2xs transition-all duration-150"
>
  <Icon className="w-5 h-5 shrink-0 text-teal-700" />
  <span className="truncate">{item.label}</span>
</Link>
```

---

## 4. نظام الجداول واستيعاب البيانات الضخمة (Data Tables & Content Density)

تم تصميم الجداول بحيث تستوعب أكبر عدد من الأعمدة والسجلات مع منع تشوه المظهر عند وجود نصوص طويلة:

### أ. هيكل الحاوية المقاوم للتمدد (Table Container)
```html
<div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
  <table className="w-full text-right text-xs text-slate-700 border-collapse font-body">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

### ب. رأس الجدول (`<thead>` & `<th>`)
```html
<thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 font-heading">
  <tr>
    <th className="px-4 py-3 text-right whitespace-nowrap font-bold">رقم السجل</th>
    <th className="px-4 py-3 text-right whitespace-nowrap font-bold">اسم الشاكي</th>
    <th className="px-4 py-3 text-right whitespace-nowrap font-bold">الجهة المشكو في حقها</th>
    <th className="px-4 py-3 text-right whitespace-nowrap font-bold">الحالة</th>
    <th className="px-4 py-3 text-right whitespace-nowrap font-bold">تاريخ الورود</th>
    <th className="px-4 py-3 text-center whitespace-nowrap font-bold">الإجراءات</th>
  </tr>
</thead>
```

### ج. خلايا البيانات (`<tbody>` & `<td>`)
- **التباعد المعتمد:** `px-4 py-3 border-b border-slate-100 align-middle`.
- **التفاعل عند مرور المؤشر (Row Hover):** `hover:bg-slate-50/70`.
- **الصفوف المميزة للتأخير أو الخطر:**
  ```css
  .table-row-delayed {
    @apply bg-red-50/80 hover:bg-red-100/80 border-r-4 border-r-red-600 text-slate-900;
  }
  ```
- **استيعاب النصوص الطويلة داخل الخلايا:**
  ```html
  <td className="px-4 py-3 max-w-[200px]">
    <span className="block truncate font-bold text-slate-900" title="النص الكامل للظهور كـ Tooltip">
      اسم المستشفى أو الطبيب النصي الطويل جداً
    </span>
    <span className="block text-[11px] text-slate-400 truncate">
      معلومات تفصيلية ثانوية
    </span>
  </td>
  ```

---

## 5. رأس الصفحات ومسار التصفح الموحد (PageHeader Token)

كل شاشة داخلية في المنظومة تبدأ بهذا التكوين القياسي لضمان عدم وجود أي اختلاف بين الصفحات:

```tsx
import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  breadcrumbs = [{ label: "الرئيسية", href: "/dashboard" }],
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-2 font-body">
      {/* 1. مسار التصفح (Breadcrumbs) */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="مسار التصفح" className="flex items-center gap-1.5 text-xs text-slate-500">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {item.href && !isLast ? (
                  <Link href={item.href} className="hover:text-teal-700 transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-slate-800 font-medium" : ""}>
                    {item.label}
                  </span>
                )}
                {!isLast && <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* 2. العنوان وأزرار العمليات السريعة */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* أزرار العمليات والشارات */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6. نظام البطاقات ومربعات المؤشرات (Cards & Stat Widgets)

### أ. البطاقة العامة (Standard Card)
```html
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
  <h2 className="text-base font-bold font-heading text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
    <span>عنوان البطاقة</span>
  </h2>
  <!-- محتوى البطاقة -->
</div>
```

### ب. بطاقات الإحصائيات المدمجة (Stat Cards)
```html
<div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4">
  <div className="space-y-1">
    <span className="text-xs font-semibold text-slate-500 block font-body">إجمالي السجلات المقيدة</span>
    <span className="text-2xl font-bold font-heading text-slate-900 font-mono">1,482</span>
    <span className="text-[11px] text-emerald-700 font-medium block font-body">+12% مقارنة بالشهر السابق</span>
  </div>
  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
    <!-- Icon w-6 h-6 -->
  </div>
</div>
```

---

## 7. مكونات الواجهة التفاعلية (Buttons, Badges & Inputs)

### أ. الأزرار الموحدة (Button Tokens)
- **الزر الأساسي (Primary):** `h-10 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors`.
- **الزر الثانوي (Secondary):** `h-10 px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium shadow-sm transition-colors`.
- **زر الخطر (Danger):** `h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors`.
- **زر مصغر للعمليات السريعة (Small):** `h-8 px-3 text-xs rounded-md`.

### ب. الشارات الموحدة (Badges)
- **الهيكل الأساسي:** `inline-flex items-center gap-1 rounded-full font-medium border font-body whitespace-nowrap`.
- **المقاس المصغر (`sm`):** `text-[11px] px-2 py-0.5`.
- **المقاس الافتراضي (`md`):** `text-xs px-2.5 py-1`.
- **المصفوفة الدلالية للألوان:**
  - **مسجل/جديد:** `bg-slate-100 text-slate-700 border-slate-200`.
  - **قيد المراجعة:** `bg-amber-100 text-amber-800 border-amber-200`.
  - **بانتظار الاعتماد:** `bg-sky-100 text-sky-800 border-sky-200`.
  - **معتمد:** `bg-emerald-100 text-emerald-800 border-emerald-200`.
  - **مرفوض/محال:** `bg-rose-100 text-rose-800 border-rose-200`.
  - **متأخر/حرج:** `bg-red-100 text-red-800 border-red-200 font-bold`.

### ج. حقول الإدخال والنماذج (Form Controls)
- **عنوان الحقل (Label):** `block text-xs font-bold text-slate-700 font-body mb-1.5`.
- **حقل النص والقوائم:**
  ```css
  .form-input, .form-select {
    @apply h-10 w-full rounded-lg border border-slate-400 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm
           placeholder-slate-400 transition-colors font-body
           hover:border-slate-500
           focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100
           disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500;
  }
  ```
- **حقل النصوص الطويلة (Textarea):** `min-h-[110px] resize-y py-2.5 leading-relaxed`.

---

## 8. دليل التطبيق على مشروع جديد بهوية بصرية مختلفة (White-labeling Guide)

لتطبيق هذا النظام على مشروع جديد (مثلاً مشروع بلون أزرق نيلي `indigo` أو كحلي ملكي `navy`):

### الخطوة 1: ملف متغيرات الألوان والسمات (`src/app/globals.css`)
قم بإنشاء أو تحديث المتغيرات؛ تحتاج فقط لتعديل `--primary` و `--primary-hover`:

```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=Tajawal:wght@400;500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-body: 'Tajawal', sans-serif;
  --font-heading: 'Cairo', sans-serif;
  
  /* عدل هذا اللون فقط ليتغير كامل طابع المشروع */
  --primary: #1E40AF;        /* Blue 800 أو لون هويتك الجديدة */
  --primary-hover: #1D4ED8;  /* Blue 700 */
  
  /* احتفظ بهذه الألوان الحيادية لأنها تضمن استقرار التصميم والهدوء */
  --bg-page: #F8FAFC;
  --bg-card: #FFFFFF;
  --border-color: #E2E8F0;
  --text-main: #0F172A;
  --text-muted: #64748B;
}

body {
  font-family: var(--font-body), "Tajawal", sans-serif;
  background-color: var(--bg-page);
  color: var(--text-main);
  direction: rtl;
  line-height: 1.625;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading), "Cairo", sans-serif;
}
```

### الخطوة 2: ملف إعدادات Tailwind (`tailwind.config.ts`)
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "Cairo", "sans-serif"],
        body: ["var(--font-body)", "Tajawal", "sans-serif"],
        sans: ["var(--font-body)", "Tajawal", "sans-serif"],
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        "card-hover": "0 4px 12px 0 rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
```

### الخطوة 3: قواعد التوحيد الصارمة لكل مبرمج في الفريق (Checklist)
1. **أي صفحة جديدة:** يجب أن تبدأ بمكون `<PageHeader>` الموحد.
2. **أي جدول:** يجب أن يوضع داخل حاوية `overflow-x-auto rounded-2xl border border-slate-200 bg-white`.
3. **أي نصوص أسماء أو بيانات:** يجب أن يُحدد لها `max-w-[...]` مع `truncate` لحماية مظهر الجدول من الانفجار العرضي.
4. **أي أيقونة بجوار نص:** يجب إضافة `shrink-0` حتى لا تنضغط الأيقونة إذا طال النص.
5. **أي قيمة حالة:** تستخدم مكون `<Badge>` الموحد وليس ألوان عشوائية ومخصصة في كل صفحة.

