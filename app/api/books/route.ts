import { NextRequest, NextResponse } from 'next/server';
import { BATCH_SIZE } from '@/lib/openlibrary';
import { resolveBookBatch } from '@/lib/cascade';
import type { BooksApiErrorBody, BooksApiResponseBody } from '@/lib/types';

/**
 * POST /api/books — وسيط خفيف نحو سلسلة مصادر متدرجة (بدون أي تخزين دائم):
 * Open Library → Open Library (بحث) → Google Books → Wikidata.
 * السلسلة نفسها في lib/cascade.ts — هذا الملف يتولى فقط اهتمامات HTTP.
 *
 * تنظيم التوقيت بين الدفعات (~1 طلب/ثانية نحو Open Library) هو مسؤولية
 * العميل (راجع lib/rate-limiter.ts) — هذا المسار حالة عديمة (stateless)
 * بالكامل ولا يحتفظ بأي شيء بين الطلبات، بما في ذلك حالة "تجاوز حصة
 * Google Books": العميل هو من يتذكرها عبر الطلبات المتتالية ويرسل
 * skipGoogleBooks=true للدفعات اللاحقة (راجع IsbnProcessorApp.tsx).
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<BooksApiResponseBody | BooksApiErrorBody>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة' }, { status: 400 });
  }

  const isbns = (body as { isbns?: unknown } | null)?.isbns;
  const skipGoogleBooks = Boolean((body as { skipGoogleBooks?: unknown } | null)?.skipGoogleBooks);

  if (!Array.isArray(isbns) || isbns.length === 0) {
    return NextResponse.json({ error: 'يجب توفير مصفوفة أكواد ISBN' }, { status: 400 });
  }

  if (isbns.length > BATCH_SIZE) {
    return NextResponse.json(
      { error: `الحد الأقصى ${BATCH_SIZE} كود ISBN لكل طلب` },
      { status: 400 }
    );
  }

  if (!isbns.every((isbn) => typeof isbn === 'string' && isbn.length > 0)) {
    return NextResponse.json({ error: 'جميع أكواد ISBN يجب أن تكون نصوصاً غير فارغة' }, { status: 400 });
  }

  try {
    const { outcomes, googleBooksQuotaExceeded } = await resolveBookBatch(isbns as string[], {
      skipGoogleBooks,
      googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY,
    });
    return NextResponse.json({ outcomes, googleBooksQuotaExceeded });
  } catch {
    return NextResponse.json({ error: 'فشل الاتصال بمصادر البيانات' }, { status: 502 });
  }
}

// لا تخزين مؤقت لهذا المسار على الإطلاق — يجب أن يكون كل رد حياً
export const dynamic = 'force-dynamic';

// دفعة واحدة قد تحتاج الآن حتى 4 مستويات جلب متتالية للأكواد الصعبة —
// نمنحها مهلة أطول من الافتراضي (10 ثوان) على منصات تدعم ذلك (Vercel Pro
// وما فوق؛ في Hobby قد تُحدَّد المهلة عند 10 ثوان بغض النظر عن هذه القيمة).
export const maxDuration = 60;
