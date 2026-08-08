import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { validateISBN } from '../lib/validator';
import { chunkArray, mapOpenLibraryInfo } from '../lib/openlibrary';
import { parseExcelFile } from '../lib/excel';
import { buildExportRow } from '../lib/export';
import { createRateLimiterState, scheduleRequest } from '../lib/rate-limiter';
import { fetchFromGoogleBooks, mapGoogleBooksVolume } from '../lib/googlebooks';
import { fetchFromWikidata, mapWikidataBinding } from '../lib/wikidata';
import { resolveBookBatch } from '../lib/cascade';

/**
 * scripts/verify.ts — مجموعة اختبارات حقيقية على الدوال النقية الفعلية
 * المستخدَمة في التطبيق (وليس نسخة موازية منها). تعمل بالكامل بدون شبكة:
 * اختبارات مصادر الشبكة (googlebooks/wikidata/cascade) تُحاكي fetch عبر
 * withMockedFetch بدل الاتصال الحقيقي — تتحقق من منطق التوجيه والتحويل
 * الفعلي، لا من توفر البيانات الحية نفسها (ذلك يتطلب بيئة غير مقيَّدة
 * الشبكة، راجع PROJECT_REPORT.md).
 *
 * التشغيل: npm run verify
 */

let passed = 0;
let failed = 0;

/**
 * check — يدعم دوال الاختبار المتزامنة وغير المتزامنة على حد سواء
 * بانتظارها فعلياً (await) دائماً. الإصدار السابق من هذا الملف كان يستدعي
 * fn() دون انتظارها لبعض الاختبارات، فكان أي رفض (rejection) داخل اختبار
 * غير متزامن يفلت من try/catch تماماً — تم إصلاح ذلك هنا جذرياً بدل تركه.
 */
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    failed++;
  }
}

// ---------- أداة محاكاة fetch للاختبارات التي تحتاج شبكة ----------

interface MockResponse {
  ok?: boolean;
  status?: number;
  json: () => Promise<unknown>;
}

type FetchMock = (url: string) => MockResponse;

async function withMockedFetch<T>(mock: FetchMock, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const result = mock(url);
    return { ok: result.ok ?? true, status: result.status ?? 200, json: result.json } as Response;
  }) as typeof fetch;

  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

async function main() {
  // ---------- validateISBN ----------

  await check('validateISBN: يقبل ISBN-13 صحيح الشكل', () => {
    assert.equal(validateISBN('9780544003415').valid, true);
  });

  await check('validateISBN: يقبل ISBN-10 صحيح الشكل', () => {
    assert.equal(validateISBN('0544003411').valid, true);
  });

  await check('validateISBN: يرفض كوداً قصيراً ويذكر السبب', () => {
    const result = validateISBN('12345');
    assert.equal(result.valid, false);
    assert.match(result.reason ?? '', /طول غير صحيح/);
  });

  await check('validateISBN: يرفض كوداً فارغاً', () => {
    assert.equal(validateISBN('').valid, false);
  });

  await check('validateISBN: يتجاهل الشرطات والمسافات قبل التحقق', () => {
    assert.equal(validateISBN('978-0-544-00341-5').valid, true);
    assert.equal(validateISBN('  9780544003415  ').valid, true);
  });

  // ---------- chunkArray ----------

  await check('chunkArray: يقسم المصفوفة إلى دفعات بالحجم الصحيح', () => {
    assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  await check('chunkArray: يتعامل مع مصفوفة فارغة', () => {
    assert.deepEqual(chunkArray([], 5), []);
  });

  await check('chunkArray: دفعة واحدة عندما يكون الحجم أكبر من المصفوفة', () => {
    assert.deepEqual(chunkArray([1, 2], 25), [[1, 2]]);
  });

  // ---------- mapOpenLibraryInfo ----------

  await check('mapOpenLibraryInfo: يحوّل بيانات كاملة بشكل صحيح', () => {
    const result = mapOpenLibraryInfo({
      title: 'The Hobbit',
      authors: [{ name: 'J.R.R. Tolkien' }],
      publishers: [{ name: 'Houghton Mifflin' }],
      publish_date: '1997',
      number_of_pages: 320,
      cover: { medium: 'https://covers.openlibrary.org/b/id/123-M.jpg' },
      subjects: [{ name: 'Fantasy' }],
    });
    assert.equal(result.title, 'The Hobbit');
    assert.equal(result.authors, 'J.R.R. Tolkien');
    assert.equal(result.pageCount, 320);
    assert.equal(result.found, true);
    assert.equal(result.thumbnail, 'https://covers.openlibrary.org/b/id/123-M.jpg');
  });

  await check('mapOpenLibraryInfo: يتعامل مع بيانات ناقصة بقيم افتراضية آمنة', () => {
    const result = mapOpenLibraryInfo({});
    assert.equal(result.title, 'غير متوفر');
    assert.equal(result.thumbnail, null);
    assert.equal(result.pageCount, null);
  });

  await check('mapOpenLibraryInfo: يدمج عدة مؤلفين بفاصلة عربية', () => {
    const result = mapOpenLibraryInfo({
      authors: [{ name: 'Author One' }, { name: 'Author Two' }],
    });
    assert.equal(result.authors, 'Author One، Author Two');
  });

  // ---------- mapGoogleBooksVolume (نقية) ----------

  await check('mapGoogleBooksVolume: يحوّل بيانات كاملة ويصحّح روابط http', () => {
    const result = mapGoogleBooksVolume('123', {
      title: 'Test Book',
      authors: ['Author A', 'Author B'],
      publisher: 'Pub',
      publishedDate: '2020',
      pageCount: 200,
      categories: ['Fiction'],
      language: 'ar',
      imageLinks: { thumbnail: 'http://books.google.com/cover.jpg' },
    });
    assert.equal(result.title, 'Test Book');
    assert.equal(result.authors, 'Author A، Author B');
    assert.equal(result.source, 'Google Books');
    assert.equal(result.thumbnail, 'https://books.google.com/cover.jpg');
  });

  // ---------- fetchFromGoogleBooks (fetch محاكى) ----------

  await check('fetchFromGoogleBooks: يعيد بيانات عند العثور على الكتاب', async () => {
    await withMockedFetch(
      () => ({
        json: async () => ({
          totalItems: 1,
          items: [{ volumeInfo: { title: 'Found Book', authors: ['X'] } }],
        }),
      }),
      async () => {
        const result = await fetchFromGoogleBooks('123');
        assert.equal(result.data?.title, 'Found Book');
        assert.equal(result.quotaExceeded, false);
      }
    );
  });

  await check('fetchFromGoogleBooks: يعيد data=null عند عدم العثور (totalItems=0)', async () => {
    await withMockedFetch(
      () => ({ json: async () => ({ totalItems: 0 }) }),
      async () => {
        const result = await fetchFromGoogleBooks('123');
        assert.equal(result.data, null);
        assert.equal(result.quotaExceeded, false);
      }
    );
  });

  await check('fetchFromGoogleBooks: يرصد تجاوز الحصة عند HTTP 403 ولا يرمي استثناءً', async () => {
    await withMockedFetch(
      () => ({ ok: false, status: 403, json: async () => ({}) }),
      async () => {
        const result = await fetchFromGoogleBooks('123');
        assert.equal(result.data, null);
        assert.equal(result.quotaExceeded, true);
      }
    );
  });

  // ---------- mapWikidataBinding (نقية) ----------

  await check('mapWikidataBinding: يحوّل binding كامل بشكل صحيح', () => {
    const result = mapWikidataBinding('123', {
      itemLabel: { value: 'WD Book' },
      authorLabel: { value: 'WD Author' },
      pubDate: { value: '1999-01-01T00:00:00Z' },
      pages: { value: '150' },
    });
    assert.equal(result.title, 'WD Book');
    assert.equal(result.authors, 'WD Author');
    assert.equal(result.publishedDate, '1999');
    assert.equal(result.pageCount, 150);
    assert.equal(result.source, 'Wikidata');
  });

  // ---------- fetchFromWikidata (fetch محاكى) ----------

  await check('fetchFromWikidata: يعيد بيانات عند وجود binding', async () => {
    await withMockedFetch(
      () => ({ json: async () => ({ results: { bindings: [{ itemLabel: { value: 'WD Found' } }] } }) }),
      async () => {
        const result = await fetchFromWikidata('9780544003415');
        assert.equal(result?.title, 'WD Found');
      }
    );
  });

  await check('fetchFromWikidata: يعيد null عند عدم وجود نتائج', async () => {
    await withMockedFetch(
      () => ({ json: async () => ({ results: { bindings: [] } }) }),
      async () => {
        const result = await fetchFromWikidata('9780544003415');
        assert.equal(result, null);
      }
    );
  });

  await check('fetchFromWikidata: يرفض أي شيء غير رقمي دون استدعاء الشبكة', async () => {
    await withMockedFetch(
      () => {
        throw new Error('لا يجب استدعاء fetch لِـ isbn غير رقمي');
      },
      async () => {
        const result = await fetchFromWikidata("'; DROP--");
        assert.equal(result, null);
      }
    );
  });

  // ---------- buildExportRow ----------

  await check('buildExportRow: يُظهر فقط الحقول المختارة', () => {
    const row = buildExportRow(
      { isbn: '123', found: true, title: 'T', authors: 'A', publisher: 'P', pageCount: 10 },
      ['title']
    );
    assert.equal(row['العنوان'], 'T');
    assert.equal('المؤلف' in row, false);
    assert.equal('الناشر' in row, false);
  });

  await check('buildExportRow: يتضمن دائماً ISBN والحالة وملاحظة الفشل', () => {
    const row = buildExportRow({ isbn: '123', found: false, reason: 'سبب الفشل' }, []);
    assert.equal(row['ISBN'], '123');
    assert.equal(row['الحالة'], 'فشل');
    assert.equal(row['ملاحظة'], 'سبب الفشل');
  });

  await check('buildExportRow: حقل المصدر الجديد يُصدَّر عند اختياره', () => {
    const row = buildExportRow({ isbn: '123', found: true, source: 'Wikidata' }, ['source']);
    assert.equal(row['المصدر'], 'Wikidata');
  });

  // ---------- rate-limiter ----------

  await check('rate-limiter: يفرض فجوة زمنية دنيا بين طلبين متتاليين', async () => {
    const state = createRateLimiterState();
    const start = Date.now();
    await scheduleRequest(state, 200);
    await scheduleRequest(state, 200);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 190, `expected >= ~200ms gap, got ${elapsed}ms`);
  });

  // ---------- resolveBookBatch (السلسلة الكاملة، fetch محاكى بالتوجيه حسب الرابط) ----------

  await check('resolveBookBatch: يمر عبر كل المستويات الأربعة بالترتيب الصحيح', async () => {
    await withMockedFetch(
      (url) => {
        if (url.includes('openlibrary.org/api/books')) {
          return { json: async () => ({ 'ISBN:1111111111': { title: 'Tier1' } }) };
        }
        if (url.includes('openlibrary.org/search.json')) {
          if (url.includes('2222222222')) return { json: async () => ({ docs: [{ title: 'Tier2' }] }) };
          return { json: async () => ({ docs: [] }) };
        }
        if (url.includes('googleapis.com/books')) {
          if (url.includes('3333333333')) {
            return { json: async () => ({ totalItems: 1, items: [{ volumeInfo: { title: 'Tier3' } }] }) };
          }
          return { json: async () => ({ totalItems: 0 }) };
        }
        if (url.includes('query.wikidata.org')) {
          return { json: async () => ({ results: { bindings: [{ itemLabel: { value: 'Tier4' } }] } }) };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      },
      async () => {
        const { outcomes, googleBooksQuotaExceeded } = await resolveBookBatch([
          '1111111111',
          '2222222222',
          '3333333333',
          '4444444444',
        ]);
        assert.equal(outcomes['1111111111'].source, 'Open Library');
        assert.equal(outcomes['2222222222'].source, 'Open Library (بحث)');
        assert.equal(outcomes['3333333333'].source, 'Google Books');
        assert.equal(outcomes['4444444444'].source, 'Wikidata');
        assert.equal(googleBooksQuotaExceeded, false);
      }
    );
  });

  await check('resolveBookBatch: ينشر googleBooksQuotaExceeded=true عند 403', async () => {
    await withMockedFetch(
      (url) => {
        if (url.includes('openlibrary.org')) return { json: async () => ({ docs: [] }) };
        if (url.includes('googleapis.com')) return { ok: false, status: 403, json: async () => ({}) };
        if (url.includes('query.wikidata.org')) return { json: async () => ({ results: { bindings: [] } }) };
        return { ok: false, status: 500, json: async () => ({}) };
      },
      async () => {
        const { googleBooksQuotaExceeded, outcomes } = await resolveBookBatch(['5555555555']);
        assert.equal(googleBooksQuotaExceeded, true);
        assert.equal(outcomes['5555555555'].found, false);
      }
    );
  });

  await check('resolveBookBatch: skipGoogleBooks=true يمنع أي استدعاء لـ Google Books فعلياً', async () => {
    await withMockedFetch(
      (url) => {
        if (url.includes('googleapis.com')) {
          throw new Error('لم يكن يجب استدعاء Google Books عندما skipGoogleBooks=true');
        }
        if (url.includes('openlibrary.org')) return { json: async () => ({ docs: [] }) };
        if (url.includes('query.wikidata.org')) {
          return { json: async () => ({ results: { bindings: [{ itemLabel: { value: 'From Wikidata' } }] } }) };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      },
      async () => {
        const { outcomes } = await resolveBookBatch(['6666666666'], { skipGoogleBooks: true });
        assert.equal(outcomes['6666666666'].source, 'Wikidata');
      }
    );
  });

  // ---------- parseExcelFile (اختبار حقيقي من طرف إلى طرف، بدون شبكة) ----------

  await check('parseExcelFile: يستخرج فقط أكواد ISBN الصحيحة من ملف Excel حقيقي', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['ISBN'],
      ['9780544003415'],
      ['978-0-451-52493-5'],
      ['not-an-isbn'],
      ['9780743273565'],
      [''],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const file = new File([buffer as unknown as BlobPart], 'test.xlsx');

    const isbns = await parseExcelFile(file);
    assert.deepEqual(isbns, ['9780544003415', '9780451524935', '9780743273565']);
  });

  console.log(`\n${passed} اختبار ناجح، ${failed} فاشل.`);
  if (failed > 0) process.exit(1);
}

main();
