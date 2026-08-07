import type { BookData, OpenLibraryBookInfo } from './types';
import { sleep } from './utils';

/**
 * openlibrary.ts — التكامل مع Open Library Books API
 * منقول من المحرك الأصلي (index.html: mapOpenLibraryInfo + fetchBatchFromOpenLibrary)
 * مع تحويله إلى TypeScript ودوال نقية (pure) تعمل في بيئتَي الخادم والمتصفح
 * على حد سواء (لا تعتمد على أي API خاص بأحدهما).
 */

/** عدد أكواد ISBN التي تُجمع في طلب HTTP واحد بدل طلب منفصل لكل كتاب */
export const BATCH_SIZE = 25;

/** الحد الأدنى بالميلي ثانية بين طلبين متتاليين نحو Open Library (~1 طلب/ثانية + هامش أمان) */
export const OL_MIN_GAP_MS = 1050;

const REQUEST_TIMEOUT_MS = 15000;

/**
 * mapOpenLibraryInfo — يحوّل عنصر بيانات خام من Open Library لصيغة موحّدة.
 * ملاحظة: "dimensions" و"source" من النسخة الأصلية لم يعودا حقلين قابلين
 * للاختيار في الواجهة (لم يردا في قائمة الحقول بمواصفات v2)، و"dimensions"
 * كانت دائماً null في التطبيق الأصلي أساساً لأن نقطة النهاية هذه لا تعيدها.
 */
export function mapOpenLibraryInfo(info: OpenLibraryBookInfo): Omit<BookData, 'isbn'> {
  return {
    found: true,
    title: info.title || 'غير متوفر',
    authors: (info.authors || []).map((a) => a.name).filter(Boolean).join('، ') || 'غير متوفر',
    publisher: (info.publishers || []).map((p) => p.name).filter(Boolean).join('، ') || 'غير متوفر',
    publishedDate: info.publish_date || 'غير متوفر',
    pageCount: info.number_of_pages ?? null,
    language: 'غير متوفر', // غير متاحة عادةً من Open Library عند هذه النقطة (jscmd=data)
    thumbnail: info.cover?.medium || info.cover?.large || info.cover?.small || null,
    categories: (info.subjects || []).map((s) => s.name).filter(Boolean).join('، '),
    source: 'Open Library',
  };
}

/**
 * fetchBatchFromOpenLibrary — يجلب بيانات عدة كتب دفعة واحدة عبر طلب HTTP واحد
 * (بدل طلب منفصل لكل ISBN)، بتمرير عدة bibkeys مفصولة بفاصلة.
 * @param isbnBatch مجموعة أكواد ISBN (بحد أقصى BATCH_SIZE)
 * @returns خريطة isbn → بيانات الكتاب (BookData كاملة، تتضمن isbn نفسه)
 */
export async function fetchBatchFromOpenLibrary(
  isbnBatch: string[]
): Promise<Record<string, BookData>> {
  const outcomes: Record<string, BookData> = {};

  if (isbnBatch.length === 0) return outcomes;

  const bibkeys = isbnBatch.map((isbn) => `ISBN:${isbn}`).join(',');
  const url = `https://openlibrary.org/api/books?bibkeys=${bibkeys}&format=json&jscmd=data`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // لا تخزين مؤقت لأي استجابة — البيانات يجب أن تكون حيّة دائماً (لا قاعدة بيانات، لا كاش دائم)
      cache: 'no-store',
      headers: {
        // Open Library توصي بترويسة User-Agent وصفية تعرّف بالتطبيق ومصدره
        'User-Agent': 'ISBN-Metadata-Processor/2.0 (+https://github.com)',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      isbnBatch.forEach((isbn) => {
        outcomes[isbn] = { isbn, found: false, reason: `HTTP ${response.status}` };
      });
      return outcomes;
    }

    const data = (await response.json()) as Record<string, OpenLibraryBookInfo>;

    isbnBatch.forEach((isbn) => {
      const info = data[`ISBN:${isbn}`];
      outcomes[isbn] = info
        ? { isbn, ...mapOpenLibraryInfo(info) }
        : { isbn, found: false, reason: 'لم يُعثر على الكتاب في Open Library' };
    });

    return outcomes;
  } catch (err) {
    clearTimeout(timeoutId);
    const reason =
      err instanceof Error && err.name === 'AbortError' ? 'انتهت مهلة الطلب' : 'فشل الاتصال بـ Open Library';
    isbnBatch.forEach((isbn) => {
      outcomes[isbn] = { isbn, found: false, reason };
    });
    return outcomes;
  }
}

/** chunkArray — يقسم مصفوفة إلى دفعات (chunks) بحجم ثابت */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// إعادة تصدير sleep هنا للحفاظ على توافق الاستيراد مع أي كود يتوقعها من هذا الملف
export { sleep };
