import { ISBN_FORMAT_REGEX } from './validator';

/**
 * excel.ts — قراءة ملفات Excel واستخراج أكواد ISBN
 * منقول من المحرك الأصلي (parseExcelFile في index.html)، مع استيراد ديناميكي
 * لمكتبة xlsx (import('xlsx')) حتى لا تُحمَّل مع الحزمة الرئيسية — كما يطلب
 * مستند المتطلبات صراحةً (تقسيم الكود / Code Splitting).
 */
export async function parseExcelFile(file: File): Promise<string[]> {
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  const isbns: string[] = [];

  rows.forEach((row, index) => {
    const firstCell = String(row?.[0] ?? '');

    // تخطَّ أول صف إذا كان header (لا يمكن تفسير محتواه كرقم بعد تنظيفه)
    if (index === 0 && Number.isNaN(Number(firstCell.replace(/[-\s]/g, '')))) return;

    const isbn = firstCell.trim().replace(/[-\s]/g, '');

    if (isbn && ISBN_FORMAT_REGEX.test(isbn)) {
      isbns.push(isbn);
    }
  });

  return isbns;
}
