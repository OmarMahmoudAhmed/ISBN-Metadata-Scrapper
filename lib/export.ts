import type { BookData, FieldKey } from './types';
import { FIELD_OPTIONS } from './fields';

/**
 * export.ts — بناء صفوف التصدير (مشتركة بين تصدير Excel و JSON)
 * يُظهر فقط الحقول المختارة من منتقي الحقول، بالإضافة إلى ISBN والحالة
 * وملاحظة الفشل (تبقى ثابتة دائماً لأنها بيانات معالجة وليست من Open Library).
 */

function statusLabel(r: BookData): string {
  if (r.found) return 'تم الجلب';
  if (r.duplicate) return 'مكرر';
  if (r.validationError) return 'غير صالح';
  return 'فشل';
}

export function buildExportRow(
  r: BookData,
  selectedFields: FieldKey[]
): Record<string, string | number> {
  const row: Record<string, string | number> = {
    ISBN: r.isbn,
    الحالة: statusLabel(r),
  };

  FIELD_OPTIONS.forEach((opt) => {
    if (!selectedFields.includes(opt.key)) return;

    if (opt.key === 'thumbnail') {
      row['رابط الغلاف'] = r.thumbnail || '';
      return;
    }

    const value = r[opt.key];
    row[opt.label] = value ?? '';
  });

  row['ملاحظة'] = r.reason || '';

  return row;
}

export function buildExportRows(
  results: Array<BookData | undefined>,
  selectedFields: FieldKey[]
): Record<string, string | number>[] {
  return results
    .filter((r): r is BookData => Boolean(r))
    .map((r) => buildExportRow(r, selectedFields));
}
