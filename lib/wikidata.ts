import type { BookData } from './types';

/**
 * wikidata.ts — الملاذ الأخير (المستوى الرابع)، بلا أي حد يومي أو مفتاح.
 * التغطية أضعف نسبياً للكتب التجارية الصغيرة أو الطبعات النادرة (Wikidata
 * تُعنى أساساً بالأعمال الموثَّقة/المُستشهَد بها)، ولذلك يأتي كملاذ أخير
 * بعد Open Library وGoogle Books لا كمصدر أساسي.
 *
 * يعتمد على خصائص Wikidata القياسية: P212 (ISBN-13) وP957 (ISBN-10)،
 * P50 (مؤلف)، P123 (ناشر)، P577 (تاريخ نشر)، P1104 (عدد صفحات)،
 * P18 (صورة). خدمة SERVICE wikibase:label تحوّل معرّفات Q إلى أسماء
 * قابلة للقراءة مباشرة داخل نفس الاستعلام.
 */

const REQUEST_TIMEOUT_MS = 12000;
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

interface SparqlBindingValue {
  value: string;
}

interface SparqlBinding {
  itemLabel?: SparqlBindingValue;
  authorLabel?: SparqlBindingValue;
  publisherLabel?: SparqlBindingValue;
  pubDate?: SparqlBindingValue;
  pages?: SparqlBindingValue;
  image?: SparqlBindingValue;
}

interface SparqlResponse {
  results?: { bindings?: SparqlBinding[] };
}

function buildQuery(isbn: string): string {
  return `
    SELECT ?item ?itemLabel ?author ?authorLabel ?publisher ?publisherLabel ?pubDate ?pages ?image WHERE {
      { ?item wdt:P212 "${isbn}" . }
      UNION
      { ?item wdt:P957 "${isbn}" . }
      OPTIONAL { ?item wdt:P50 ?author . }
      OPTIONAL { ?item wdt:P123 ?publisher . }
      OPTIONAL { ?item wdt:P577 ?pubDate . }
      OPTIONAL { ?item wdt:P1104 ?pages . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ar,en". }
    }
    LIMIT 1
  `;
}

/** دالة نقية قابلة للاختبار بمعزل عن الشبكة */
export function mapWikidataBinding(isbn: string, binding: SparqlBinding): BookData {
  const pubDateRaw = binding.pubDate?.value;

  return {
    isbn,
    found: true,
    title: binding.itemLabel?.value || 'غير متوفر',
    authors: binding.authorLabel?.value || 'غير متوفر',
    publisher: binding.publisherLabel?.value || 'غير متوفر',
    // P577 عادة تاريخ كامل (دقة سنة غالباً) — نكتفي بالسنة لتطابق باقي المصادر
    publishedDate: pubDateRaw ? pubDateRaw.slice(0, 4) : 'غير متوفر',
    pageCount: binding.pages?.value ? Number(binding.pages.value) : null,
    language: 'غير متوفر',
    thumbnail: binding.image?.value || null,
    categories: '',
    source: 'Wikidata',
  };
}

export async function fetchFromWikidata(isbn: string): Promise<BookData | null> {
  // حراسة إضافية: isbn يصل هنا مُتحقَّقاً منه دائماً (أرقام فقط) من مسار
  // التطبيق الفعلي، لكن هذه الدالة قد تُستدعى مستقبلاً من سياق آخر —
  // نرفض أي شيء غير رقمي بدل تمريره داخل نص استعلام SPARQL مباشرة.
  if (!/^\d+$/.test(isbn)) return null;

  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(buildQuery(isbn))}&format=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/sparql-results+json',
        // سياسة Wikimedia تتطلب User-Agent وصفياً؛ استبدل الرابط أدناه
        // برابط مشروعك الحقيقي عند النشر (راجع PROJECT_REPORT.md).
        'User-Agent': 'ISBN-Metadata-Processor/2.0 (+https://github.com)',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const json = (await response.json()) as SparqlResponse;
    const binding = json.results?.bindings?.[0];
    if (!binding) return null;

    return mapWikidataBinding(isbn, binding);
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
