import type { BookData } from './types';
import { fetchBatchFromOpenLibrary, fetchFromOpenLibrarySearch } from './openlibrary';
import { fetchFromGoogleBooks } from './googlebooks';
import { fetchFromWikidata } from './wikidata';

/**
 * cascade.ts — ينسّق سلسلة المصادر المتدرجة (fallback cascade):
 *
 *   1. Open Library — bibkeys (دفعة واحدة، طلب HTTP واحد لكل الدفعة)
 *   2. Open Library — search.json (لكل كود لم يُعثر عليه، بلا تكلفة إضافية)
 *   3. Google Books  (لكل كود ما زال مفقوداً فقط — يحمي الحصة اليومية)
 *   4. Wikidata       (الملاذ الأخير، بلا أي حد يومي)
 *
 * كل مستوى يُطبَّق فقط على الأكواد التي فشلت في كل المستويات السابقة —
 * هذا التصميم بحد ذاته هو ما يحمي حصة Google Books المحدودة، لا حاجة
 * لعدّاد يدوي أو قاعدة بيانات لتتبع الاستهلاك.
 *
 * منطق منفصل عمداً عن app/api/books/route.ts (الذي يتولى فقط اهتمامات
 * HTTP: التحقق من الطلب، رموز الحالة) حتى يمكن اختبار السلسلة نفسها
 * بمعزل عن Next.js — راجع scripts/verify.ts.
 */

export interface CascadeOptions {
  /** تخطَّ Google Books كلياً (بعد رصد تجاوز حصة سابق في نفس جلسة العميل) */
  skipGoogleBooks?: boolean;
  googleBooksApiKey?: string;
}

export interface CascadeResult {
  outcomes: Record<string, BookData>;
  googleBooksQuotaExceeded: boolean;
}

function missingFrom(isbns: string[], outcomes: Record<string, BookData>): string[] {
  return isbns.filter((isbn) => !outcomes[isbn]?.found);
}

export async function resolveBookBatch(
  isbns: string[],
  options: CascadeOptions = {}
): Promise<CascadeResult> {
  // المستوى 1: Open Library bibkeys — طلب HTTP واحد للدفعة كاملة
  const outcomes = await fetchBatchFromOpenLibrary(isbns);

  // المستوى 2: Open Library search.json — بالتوازي، لكل كود لم يُعثر عليه فقط
  const afterTier1 = missingFrom(isbns, outcomes);
  if (afterTier1.length > 0) {
    const results = await Promise.all(afterTier1.map((isbn) => fetchFromOpenLibrarySearch(isbn)));
    afterTier1.forEach((isbn, i) => {
      const result = results[i];
      if (result) outcomes[isbn] = result;
    });
  }

  // المستوى 3: Google Books — فقط إن لم يُطلب تخطّيه ولا يزال هناك أكواد مفقودة
  let googleBooksQuotaExceeded = false;
  const afterTier2 = missingFrom(isbns, outcomes);
  if (afterTier2.length > 0 && !options.skipGoogleBooks) {
    const results = await Promise.all(
      afterTier2.map((isbn) => fetchFromGoogleBooks(isbn, options.googleBooksApiKey))
    );
    afterTier2.forEach((isbn, i) => {
      const result = results[i];
      if (result.quotaExceeded) googleBooksQuotaExceeded = true;
      if (result.data) outcomes[isbn] = result.data;
    });
  }

  // المستوى 4: Wikidata — الملاذ الأخير
  const afterTier3 = missingFrom(isbns, outcomes);
  if (afterTier3.length > 0) {
    const results = await Promise.all(afterTier3.map((isbn) => fetchFromWikidata(isbn)));
    afterTier3.forEach((isbn, i) => {
      const result = results[i];
      if (result) outcomes[isbn] = result;
    });
  }

  return { outcomes, googleBooksQuotaExceeded };
}
