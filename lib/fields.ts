import type { FieldKey } from './types';

/**
 * fields.ts — الحقول القابلة للاختيار من بيانات الكتاب
 * الحقول الثمانية الأولى مطابقة تماماً لمواصفات v2 الأصلية. حقل "المصدر"
 * أُضيف لاحقاً مع سلسلة المصادر المتدرجة (lib/cascade.ts) — أصبح ذا قيمة
 * حقيقية الآن (يتغيّر فعلاً حسب أي مستوى أجاب: Open Library/Google
 * Books/Wikidata)، بخلاف السابق حين كان دائماً "Open Library" ثابتاً.
 */

export interface FieldOption {
  key: FieldKey;
  label: string;
}

export const FIELD_OPTIONS: FieldOption[] = [
  { key: 'title', label: 'العنوان' },
  { key: 'authors', label: 'المؤلف' },
  { key: 'publisher', label: 'الناشر' },
  { key: 'publishedDate', label: 'سنة النشر' },
  { key: 'pageCount', label: 'عدد الصفحات' },
  { key: 'thumbnail', label: 'صورة الغلاف' },
  { key: 'language', label: 'اللغة' },
  { key: 'categories', label: 'التصنيفات' },
  { key: 'source', label: 'المصدر' },
];

export const DEFAULT_SELECTED_FIELDS: FieldKey[] = FIELD_OPTIONS.map((f) => f.key);

export const FIELD_SELECTION_STORAGE_KEY = 'isbn-processor:selected-fields';
