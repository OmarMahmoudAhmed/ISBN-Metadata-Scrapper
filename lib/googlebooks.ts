import type { BookData } from './types';

/**
 * googlebooks.ts — مصدر بديل (المستوى الثالث) يُستدعى فقط للأكواد التي
 * فشلت في Open Library (bibkeys وsearch.json معاً). هذا التصميم بحد ذاته
 * يحمي حصة Google Books اليومية (1000 طلب/يوم افتراضياً بدون رسوم أو
 * بطاقة ائتمان لكل مفتاح، غير مضمونة الزيادة) لأنه لا يُستهلَك إلا على
 * "الكتب الصعبة" لا كامل الدفعة.
 *
 * لا يوجد لدى Google Books نقطة نهاية دفعية (bibkeys)، لذا كل ISBN يحتاج
 * طلبه الخاص — يُطبَّق بالتوازي (Promise.all) على الأكواد المتبقية فقط،
 * وليس تسلسلياً، لأن Google لا يفرض توقيتاً صارماً كـ Open Library.
 */

const REQUEST_TIMEOUT_MS = 10000;

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
}

interface GoogleBooksApiResponse {
  totalItems?: number;
  items?: { volumeInfo?: GoogleBooksVolumeInfo }[];
}

export interface GoogleBooksResult {
  /** بيانات الكتاب إن وُجد، أو null إن لم يُعثر عليه (وليس بالضرورة خطأ) */
  data: BookData | null;
  /** true فقط عند رصد رمز تجاوز حصة (403/429) — إشارة للمتصل بإيقاف
   *  استخدام Google Books لبقية الجلسة، راجع lib/cascade.ts */
  quotaExceeded: boolean;
}

/** دالة نقية قابلة للاختبار بمعزل عن الشبكة */
export function mapGoogleBooksVolume(isbn: string, info: GoogleBooksVolumeInfo): BookData {
  const rawThumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;

  return {
    isbn,
    found: true,
    title: info.title || 'غير متوفر',
    authors: info.authors?.filter(Boolean).join('، ') || 'غير متوفر',
    publisher: info.publisher || 'غير متوفر',
    publishedDate: info.publishedDate || 'غير متوفر',
    pageCount: info.pageCount ?? null,
    language: info.language || 'غير متوفر',
    // جوجل تُعيد أحياناً روابط http بدل https — نصحّحها هنا
    thumbnail: rawThumbnail ? rawThumbnail.replace(/^http:/, 'https:') : null,
    categories: info.categories?.filter(Boolean).join('، ') || '',
    source: 'Google Books',
  };
}

export async function fetchFromGoogleBooks(isbn: string, apiKey?: string): Promise<GoogleBooksResult> {
  const params = new URLSearchParams({ q: `isbn:${isbn}` });
  if (apiKey) params.set('key', apiKey);

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeoutId);

    // جوجل تستخدم 403 لتجاوز الحصة اليومية (dailyLimitExceeded/rateLimitExceeded)،
    // و429 في بعض المسارات الأحدث — نتعامل مع الاثنين كإشارة واحدة للتراجع.
    if (response.status === 403 || response.status === 429) {
      return { data: null, quotaExceeded: true };
    }

    if (!response.ok) {
      return { data: null, quotaExceeded: false };
    }

    const json = (await response.json()) as GoogleBooksApiResponse;
    const info = json.items?.[0]?.volumeInfo;

    if (!json.totalItems || !info) {
      return { data: null, quotaExceeded: false };
    }

    return { data: mapGoogleBooksVolume(isbn, info), quotaExceeded: false };
  } catch {
    clearTimeout(timeoutId);
    return { data: null, quotaExceeded: false };
  }
}
