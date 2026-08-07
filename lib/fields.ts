import type { FieldKey } from './types';

/**
 * fields.ts — الحقول القابلة للاختيار من بيانات Open Library
 * القائمة مطابقة تماماً لما ورد في مواصفات v2 (قسم "تحديد الحقول المطلوبة"):
 * العنوان، المؤلف، الناشر، سنة النشر، عدد الصفحات، صورة الغلاف، اللغة، التصنيفات.
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
];

export const DEFAULT_SELECTED_FIELDS: FieldKey[] = FIELD_OPTIONS.map((f) => f.key);

export const FIELD_SELECTION_STORAGE_KEY = 'isbn-processor:selected-fields';
