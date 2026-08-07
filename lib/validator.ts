/**
 * validator.ts — التحقق من صحة أكواد ISBN
 * منقول من المحرك الأصلي (validateISBN في index.html) بدون تغيير في السلوك:
 * يتحقق فقط من الطول (10 أو 13 رقماً) بعد إزالة الشرطات والمسافات، دون
 * التحقق من رقم التحقق (checksum digit). هذا يطابق سلوك النسخة v1 تماماً.
 *
 * ملاحظة: هذا النمط (regex) هو المصدر الوحيد المستخدم في المشروع لتحديد
 * "شكل" ISBN صالح، سواء أثناء فلترة ملف Excel (excel.ts) أو أثناء
 * التحقق قبل الإرسال للخادم (هنا) — بخلاف النسخة الأصلية التي كررت
 * نفس المنطق في مكانين بصياغتين مختلفتين.
 */

export const ISBN_FORMAT_REGEX = /^\d{10}(\d{3})?$/;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateISBN(isbn: string): ValidationResult {
  if (!isbn) return { valid: false, reason: 'كود فارغ' };

  const clean = isbn.replace(/[-\s]/g, '');

  if (!ISBN_FORMAT_REGEX.test(clean)) {
    return { valid: false, reason: `طول غير صحيح: ${clean.length} رقم` };
  }

  return { valid: true };
}
