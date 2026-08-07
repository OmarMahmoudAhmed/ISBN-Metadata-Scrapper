import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { validateISBN } from '../lib/validator';
import { chunkArray, mapOpenLibraryInfo } from '../lib/openlibrary';
import { parseExcelFile } from '../lib/excel';
import { buildExportRow } from '../lib/export';
import { createRateLimiterState, scheduleRequest } from '../lib/rate-limiter';

/**
 * scripts/verify.ts — مجموعة اختبارات حقيقية على الدوال النقية الفعلية
 * المستخدَمة في التطبيق (وليس نسخة موازية منها). تعمل بالكامل بدون شبكة:
 * لا تختبر الاتصال الحقيقي بـ Open Library (ذلك يتطلب بيئة غير مقيَّدة
 * الشبكة، راجع PROJECT_REPORT.md لتفاصيل ما اختُبر وما لم يُختبَر).
 *
 * التشغيل: npm run verify
 */

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    failed++;
  }
}

// ---------- validateISBN ----------

check('validateISBN: يقبل ISBN-13 صحيح الشكل', () => {
  assert.equal(validateISBN('9780544003415').valid, true);
});

check('validateISBN: يقبل ISBN-10 صحيح الشكل', () => {
  assert.equal(validateISBN('0544003411').valid, true);
});

check('validateISBN: يرفض كوداً قصيراً ويذكر السبب', () => {
  const result = validateISBN('12345');
  assert.equal(result.valid, false);
  assert.match(result.reason ?? '', /طول غير صحيح/);
});

check('validateISBN: يرفض كوداً فارغاً', () => {
  assert.equal(validateISBN('').valid, false);
});

check('validateISBN: يتجاهل الشرطات والمسافات قبل التحقق', () => {
  assert.equal(validateISBN('978-0-544-00341-5').valid, true);
  assert.equal(validateISBN('  9780544003415  ').valid, true);
});

// ---------- chunkArray ----------

check('chunkArray: يقسم المصفوفة إلى دفعات بالحجم الصحيح', () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

check('chunkArray: يتعامل مع مصفوفة فارغة', () => {
  assert.deepEqual(chunkArray([], 5), []);
});

check('chunkArray: دفعة واحدة عندما يكون الحجم أكبر من المصفوفة', () => {
  assert.deepEqual(chunkArray([1, 2], 25), [[1, 2]]);
});

// ---------- mapOpenLibraryInfo ----------

check('mapOpenLibraryInfo: يحوّل بيانات كاملة بشكل صحيح', () => {
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

check('mapOpenLibraryInfo: يتعامل مع بيانات ناقصة بقيم افتراضية آمنة', () => {
  const result = mapOpenLibraryInfo({});
  assert.equal(result.title, 'غير متوفر');
  assert.equal(result.thumbnail, null);
  assert.equal(result.pageCount, null);
});

check('mapOpenLibraryInfo: يدمج عدة مؤلفين بفاصلة عربية', () => {
  const result = mapOpenLibraryInfo({
    authors: [{ name: 'Author One' }, { name: 'Author Two' }],
  });
  assert.equal(result.authors, 'Author One، Author Two');
});

// ---------- buildExportRow ----------

check('buildExportRow: يُظهر فقط الحقول المختارة', () => {
  const row = buildExportRow(
    { isbn: '123', found: true, title: 'T', authors: 'A', publisher: 'P', pageCount: 10 },
    ['title']
  );
  assert.equal(row['العنوان'], 'T');
  assert.equal('المؤلف' in row, false);
  assert.equal('الناشر' in row, false);
});

check('buildExportRow: يتضمن دائماً ISBN والحالة وملاحظة الفشل', () => {
  const row = buildExportRow({ isbn: '123', found: false, reason: 'سبب الفشل' }, []);
  assert.equal(row['ISBN'], '123');
  assert.equal(row['الحالة'], 'فشل');
  assert.equal(row['ملاحظة'], 'سبب الفشل');
});

// ---------- rate-limiter ----------

check('rate-limiter: يفرض فجوة زمنية دنيا بين طلبين متتاليين', async () => {
  const state = createRateLimiterState();
  const start = Date.now();
  await scheduleRequest(state, 200);
  await scheduleRequest(state, 200);
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 190, `expected >= ~200ms gap, got ${elapsed}ms`);
});

// ---------- parseExcelFile (اختبار حقيقي من طرف إلى طرف، بدون شبكة) ----------

async function testParseExcelFile() {
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
  // ملاحظة: Buffer متوافق فعلياً وقت التشغيل مع BlobPart (Node's File/Blob
  // يقبلانه فعلاً)، لكن تعريفات TypeScript لـ @types/node تجعل خاصية
  // buffer.buffer من نوع ArrayBufferLike (اتحاد مع SharedArrayBuffer) بينما
  // يتوقّع BlobPart تحديداً ArrayBuffer — هذا خلاف في التعريفات الساكنة فقط
  // وليس مشكلة حقيقية وقت التشغيل، لذا التحويل الصريح هنا آمن ومقصود.
  const file = new File([buffer as unknown as BlobPart], 'test.xlsx');

  const isbns = await parseExcelFile(file);
  assert.deepEqual(isbns, ['9780544003415', '9780451524935', '9780743273565']);
  console.log('✅ parseExcelFile: يستخرج فقط أكواد ISBN الصحيحة من ملف Excel حقيقي، متجاهلاً الرأس وغير الصالح');
  passed++;
}

async function main() {
  await testParseExcelFile().catch((err) => {
    console.error('❌ parseExcelFile: فشل الاختبار');
    console.error(err);
    failed++;
  });

  console.log(`\n${passed} اختبار ناجح، ${failed} فاشل.`);
  if (failed > 0) process.exit(1);
}

main();
