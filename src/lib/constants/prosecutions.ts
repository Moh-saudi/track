export interface OfficialProsecution {
  id?: string;
  name: string;
  type: "PLENARY" | "DISTRICT";
  governorate: string;
  parentName?: string;
}

export const OFFICIAL_PROSECUTIONS_LIST: OfficialProsecution[] = [
  // القاهرة
  { name: "جنوب القاهرة الكلية", type: "PLENARY", governorate: "القاهرة" },
  { name: "السيدة زينب الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "جنوب القاهرة الكلية" },
  { name: "مصر القديمة الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "جنوب القاهرة الكلية" },
  { name: "المعادي الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "جنوب القاهرة الكلية" },
  { name: "شمال القاهرة الكلية", type: "PLENARY", governorate: "القاهرة" },
  { name: "روض الفرج الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "شمال القاهرة الكلية" },
  { name: "شبرا الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "شمال القاهرة الكلية" },
  { name: "الساحل الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "شمال القاهرة الكلية" },
  { name: "شرق القاهرة الكلية", type: "PLENARY", governorate: "القاهرة" },
  { name: "مدينة نصر الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "شرق القاهرة الكلية" },
  { name: "مصر الجديدة الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "شرق القاهرة الكلية" },
  { name: "عين شمس الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "شرق القاهرة الكلية" },
  { name: "غرب القاهرة الكلية", type: "PLENARY", governorate: "القاهرة" },
  { name: "الوايلي الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "غرب القاهرة الكلية" },
  { name: "بولاق الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "غرب القاهرة الكلية" },
  { name: "وسط القاهرة الكلية", type: "PLENARY", governorate: "القاهرة" },
  { name: "عابدين الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "وسط القاهرة الكلية" },
  { name: "القاهرة الجديدة الكلية", type: "PLENARY", governorate: "القاهرة" },
  { name: "التجمع الخامس الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "القاهرة الجديدة الكلية" },
  { name: "حلوان الكلية", type: "PLENARY", governorate: "القاهرة" },
  { name: "15 مايو الجزئية", type: "DISTRICT", governorate: "القاهرة", parentName: "حلوان الكلية" },
  { name: "المحكمة التأديبية للصحة", type: "PLENARY", governorate: "القاهرة" },

  // الجيزة
  { name: "شمال الجيزة الكلية", type: "PLENARY", governorate: "الجيزة" },
  { name: "العجوزة الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "شمال الجيزة الكلية" },
  { name: "الدقي الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "شمال الجيزة الكلية" },
  { name: "إمبابة الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "شمال الجيزة الكلية" },
  { name: "جنوب الجيزة الكلية", type: "PLENARY", governorate: "الجيزة" },
  { name: "الهرم الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "جنوب الجيزة الكلية" },
  { name: "العمرانية الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "جنوب الجيزة الكلية" },
  { name: "بولاق الدكرور الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "جنوب الجيزة الكلية" },
  { name: "السادس من أكتوبر الكلية", type: "PLENARY", governorate: "الجيزة" },
  { name: "أكتوبر أول الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "السادس من أكتوبر الكلية" },
  { name: "الشيخ زايد الجزئية", type: "DISTRICT", governorate: "الجيزة", parentName: "السادس من أكتوبر الكلية" },

  // الإسكندرية
  { name: "شرق الإسكندرية الكلية", type: "PLENARY", governorate: "الإسكندرية" },
  { name: "الرمل الجزئية", type: "DISTRICT", governorate: "الإسكندرية", parentName: "شرق الإسكندرية الكلية" },
  { name: "سيدي جابر الجزئية", type: "DISTRICT", governorate: "الإسكندرية", parentName: "شرق الإسكندرية الكلية" },
  { name: "منتزه أول الجزئية", type: "DISTRICT", governorate: "الإسكندرية", parentName: "شرق الإسكندرية الكلية" },
  { name: "غرب الإسكندرية الكلية", type: "PLENARY", governorate: "الإسكندرية" },
  { name: "مينا البصل الجزئية", type: "DISTRICT", governorate: "الإسكندرية", parentName: "غرب الإسكندرية الكلية" },
  { name: "كرموز الجزئية", type: "DISTRICT", governorate: "الإسكندرية", parentName: "غرب الإسكندرية الكلية" },
  { name: "الدخيلة الكلية", type: "PLENARY", governorate: "الإسكندرية" },
  { name: "العامرية الجزئية", type: "DISTRICT", governorate: "الإسكندرية", parentName: "الدخيلة الكلية" },

  // القليوبية
  { name: "جنوب بنها الكلية", type: "PLENARY", governorate: "القليوبية" },
  { name: "شبرا الخيمة الجزئية", type: "DISTRICT", governorate: "القليوبية", parentName: "جنوب بنها الكلية" },
  { name: "قليوب الجزئية", type: "DISTRICT", governorate: "القليوبية", parentName: "جنوب بنها الكلية" },
  { name: "شمال بنها الكلية", type: "PLENARY", governorate: "القليوبية" },
  { name: "بنها الجزئية", type: "DISTRICT", governorate: "القليوبية", parentName: "شمال بنها الكلية" },
  { name: "طوخ الجزئية", type: "DISTRICT", governorate: "القليوبية", parentName: "شمال بنها الكلية" },

  // الدقهلية
  { name: "جنوب المنصورة الكلية", type: "PLENARY", governorate: "الدقهلية" },
  { name: "المنصورة الجزئية", type: "DISTRICT", governorate: "الدقهلية", parentName: "جنوب المنصورة الكلية" },
  { name: "ميت غمر الجزئية", type: "DISTRICT", governorate: "الدقهلية", parentName: "جنوب المنصورة الكلية" },
  { name: "شمال المنصورة الكلية", type: "PLENARY", governorate: "الدقهلية" },
  { name: "دكرنس الجزئية", type: "DISTRICT", governorate: "الدقهلية", parentName: "شمال المنصورة الكلية" },

  // الشرقية
  { name: "جنوب الزقازيق الكلية", type: "PLENARY", governorate: "الشرقية" },
  { name: "الزقازيق الجزئية", type: "DISTRICT", governorate: "الشرقية", parentName: "جنوب الزقازيق الكلية" },
  { name: "بلبيس الجزئية", type: "DISTRICT", governorate: "الشرقية", parentName: "جنوب الزقازيق الكلية" },
  { name: "شمال الزقازيق الكلية", type: "PLENARY", governorate: "الشرقية" },
  { name: "فاقوس الجزئية", type: "DISTRICT", governorate: "الشرقية", parentName: "شمال الزقازيق الكلية" },

  // الغربية
  { name: "غرب طنطا الكلية", type: "PLENARY", governorate: "الغربية" },
  { name: "طنطا الجزئية", type: "DISTRICT", governorate: "الغربية", parentName: "غرب طنطا الكلية" },
  { name: "كفر الزيات الجزئية", type: "DISTRICT", governorate: "الغربية", parentName: "غرب طنطا الكلية" },
  { name: "شرق طنطا الكلية", type: "PLENARY", governorate: "الغربية" },
  { name: "المحلة الكبرى الجزئية", type: "DISTRICT", governorate: "الغربية", parentName: "شرق طنطا الكلية" },

  // المنوفية
  { name: "شبين الكوم الكلية", type: "PLENARY", governorate: "المنوفية" },
  { name: "شبين الكوم الجزئية", type: "DISTRICT", governorate: "المنوفية", parentName: "شبين الكوم الكلية" },
  { name: "تلا الجزئية", type: "DISTRICT", governorate: "المنوفية", parentName: "شبين الكوم الكلية" },
  { name: "أشمون الجزئية", type: "DISTRICT", governorate: "المنوفية", parentName: "شبين الكوم الكلية" },

  // البحيرة
  { name: "جنوب دمنهور الكلية", type: "PLENARY", governorate: "البحيرة" },
  { name: "دمنهور الجزئية", type: "DISTRICT", governorate: "البحيرة", parentName: "جنوب دمنهور الكلية" },
  { name: "شمال دمنهور الكلية", type: "PLENARY", governorate: "البحيرة" },
  { name: "كفر الدوار الجزئية", type: "DISTRICT", governorate: "البحيرة", parentName: "شمال دمنهور الكلية" },

  // كفر الشيخ
  { name: "كفر الشيخ الكلية", type: "PLENARY", governorate: "كفر الشيخ" },
  { name: "كفر الشيخ الجزئية", type: "DISTRICT", governorate: "كفر الشيخ", parentName: "كفر الشيخ الكلية" },
  { name: "دسوق الجزئية", type: "DISTRICT", governorate: "كفر الشيخ", parentName: "كفر الشيخ الكلية" },

  // دمياط
  { name: "دمياط الكلية", type: "PLENARY", governorate: "دمياط" },
  { name: "دمياط الجزئية", type: "DISTRICT", governorate: "دمياط", parentName: "دمياط الكلية" },
  { name: "الزرقا الجزئية", type: "DISTRICT", governorate: "دمياط", parentName: "دمياط الكلية" },

  // بورسعيد
  { name: "بورسعيد الكلية", type: "PLENARY", governorate: "بورسعيد" },
  { name: "الميناء الجزئية", type: "DISTRICT", governorate: "بورسعيد", parentName: "بورسعيد الكلية" },

  // الإسماعيلية
  { name: "الإسماعيلية الكلية", type: "PLENARY", governorate: "الإسماعيلية" },
  { name: "قسم ثان وثالث الإسماعيلية", type: "DISTRICT", governorate: "الإسماعيلية", parentName: "الإسماعيلية الكلية" },

  // السويس
  { name: "السويس الكلية", type: "PLENARY", governorate: "السويس" },
  { name: "الأربعين الجزئية", type: "DISTRICT", governorate: "السويس", parentName: "السويس الكلية" },

  // الفيوم
  { name: "الفيوم الكلية", type: "PLENARY", governorate: "الفيوم" },
  { name: "الفيوم الجزئية", type: "DISTRICT", governorate: "الفيوم", parentName: "الفيوم الكلية" },

  // بني سويف
  { name: "بني سويف الكلية", type: "PLENARY", governorate: "بني سويف" },
  { name: "بني سويف الجزئية", type: "DISTRICT", governorate: "بني سويف", parentName: "بني سويف الكلية" },

  // المنيا
  { name: "جنوب المنيا الكلية", type: "PLENARY", governorate: "المنيا" },
  { name: "المنيا الجزئية", type: "DISTRICT", governorate: "المنيا", parentName: "جنوب المنيا الكلية" },
  { name: "ملوي الجزئية", type: "DISTRICT", governorate: "المنيا", parentName: "جنوب المنيا الكلية" },
  { name: "شمال المنيا الكلية", type: "PLENARY", governorate: "المنيا" },
  { name: "بني مزار الجزئية", type: "DISTRICT", governorate: "المنيا", parentName: "شمال المنيا الكلية" },

  // أسيوط
  { name: "جنوب أسيوط الكلية", type: "PLENARY", governorate: "أسيوط" },
  { name: "أسيوط الجزئية", type: "DISTRICT", governorate: "أسيوط", parentName: "جنوب أسيوط الكلية" },
  { name: "شمال أسيوط الكلية", type: "PLENARY", governorate: "أسيوط" },
  { name: "ديروط الجزئية", type: "DISTRICT", governorate: "أسيوط", parentName: "شمال أسيوط الكلية" },

  // سوهاج
  { name: "جنوب سوهاج الكلية", type: "PLENARY", governorate: "سوهاج" },
  { name: "سوهاج الجزئية", type: "DISTRICT", governorate: "سوهاج", parentName: "جنوب سوهاج الكلية" },
  { name: "شمال سوهاج الكلية", type: "PLENARY", governorate: "سوهاج" },
  { name: "طهطا الجزئية", type: "DISTRICT", governorate: "سوهاج", parentName: "شمال سوهاج الكلية" },

  // قنا
  { name: "قنا الكلية", type: "PLENARY", governorate: "قنا" },
  { name: "قنا الجزئية", type: "DISTRICT", governorate: "قنا", parentName: "قنا الكلية" },
  { name: "نجع حمادي الجزئية", type: "DISTRICT", governorate: "قنا", parentName: "قنا الكلية" },

  // الأقصر
  { name: "الأقصر الكلية", type: "PLENARY", governorate: "الأقصر" },
  { name: "الأقصر الجزئية", type: "DISTRICT", governorate: "الأقصر", parentName: "الأقصر الكلية" },
  { name: "إسنا الجزئية", type: "DISTRICT", governorate: "الأقصر", parentName: "الأقصر الكلية" },

  // أسوان
  { name: "أسوان الكلية", type: "PLENARY", governorate: "أسوان" },
  { name: "أسوان الجزئية", type: "DISTRICT", governorate: "أسوان", parentName: "أسوان الكلية" },
  { name: "كوم أمبو الجزئية", type: "DISTRICT", governorate: "أسوان", parentName: "أسوان الكلية" },

  // البحر الأحمر
  { name: "البحر الأحمر الكلية", type: "PLENARY", governorate: "البحر الأحمر" },
  { name: "الغردقة الجزئية", type: "DISTRICT", governorate: "البحر الأحمر", parentName: "البحر الأحمر الكلية" },
];
