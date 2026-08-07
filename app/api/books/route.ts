import { NextRequest, NextResponse } from 'next/server';
import { fetchBatchFromOpenLibrary, BATCH_SIZE } from '@/lib/openlibrary';
import type { BooksApiErrorBody, BooksApiResponseBody } from '@/lib/types';

/**
 * POST /api/books — وسيط خفيف نحو Open Library (بدون أي تخزين دائم).
 * يستقبل دفعة واحدة من أكواد ISBN (بحد أقصى BATCH_SIZE)، ويُعيد بيانات
 * موحّدة لكل كود. تنظيم التوقيت بين الدفعات (~1 طلب/ثانية) هو مسؤولية
 * العميل (راجع lib/rate-limiter.ts) — هذا المسار حالة عديمة (stateless)
 * بالكامل ولا يحتفظ بأي شيء بين الطلبات.
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
    const outcomes = await fetchBatchFromOpenLibrary(isbns as string[]);
    return NextResponse.json({ outcomes });
  } catch {
    return NextResponse.json({ error: 'فشل الاتصال بـ Open Library' }, { status: 502 });
  }
}

// لا تخزين مؤقت لهذا المسار على الإطلاق — يجب أن يكون كل رد حياً
export const dynamic = 'force-dynamic';
