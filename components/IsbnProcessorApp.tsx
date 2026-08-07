'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { RotateCcw, CirclePause } from 'lucide-react';
import type {
  ActivityItem,
  ActivityType,
  BookData,
  BooksApiResponseBody,
  FieldKey,
  ProcessingStats,
  ToastItem,
  ToastType,
} from '@/lib/types';
import { validateISBN } from '@/lib/validator';
import { parseExcelFile } from '@/lib/excel';
import { BATCH_SIZE, OL_MIN_GAP_MS, chunkArray } from '@/lib/openlibrary';
import { createRateLimiterState, scheduleRequest } from '@/lib/rate-limiter';
import { DEFAULT_SELECTED_FIELDS } from '@/lib/fields';
import { resultsCache } from '@/lib/cache';
import { SAMPLE_ISBNS } from '@/lib/constants';

import UploadZone from './UploadZone';
import FileInfoCard from './FileInfoCard';
import FieldSelector from './FieldSelector';
import ProcessingPanel from './ProcessingPanel';
import SummaryGrid from './SummaryGrid';
import ResultsGrid from './ResultsGrid';
import ExportButtons from './ExportButtons';

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

/**
 * IsbnProcessorApp — المكوّن الرئيسي الذي يملك كل حالة الأداة ومنطق
 * المعالجة (منقول من processQueue/startProcessing في المحرك الأصلي).
 *
 * معمارية الجلب: كل دفعة تُرسَل عبر POST /api/books (وسيط Next.js) بدل
 * الطلب المباشر من المتصفح إلى Open Library — يخفي منطق التحويل ويسمح
 * بترويسة User-Agent وصفية. بوابة تنظيم الطلبات (~1/ثانية) تبقى من جانب
 * العميل تماماً كالنسخة الأصلية (راجع lib/rate-limiter.ts للتفاصيل).
 */
export default function IsbnProcessorApp() {
  const [rawData, setRawData] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileMeta, setFileMeta] = useState('');

  const [hasStarted, setHasStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [results, setResults] = useState<Array<BookData | undefined>>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<ProcessingStats>({ processed: 0, total: 0, success: 0, failed: 0 });
  const [status, setStatusText] = useState('جاهز للمعالجة');

  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(DEFAULT_SELECTED_FIELDS);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const shouldStopRef = useRef(false);
  const rateLimiterRef = useRef(createRateLimiterState());

  const addActivity = useCallback((text: string, type: ActivityType = 'info') => {
    setActivity((prev) => {
      const time = new Date().toLocaleTimeString('ar', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return [{ id, text, type, time }, ...prev].slice(0, 50);
    });
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        showToast('يُدعم فقط ملفات Excel (.xlsx, .xls)', 'error');
        return;
      }

      setStatusText('جاري قراءة الملف...');

      try {
        const isbns = await parseExcelFile(file);

        if (isbns.length === 0) {
          showToast('لم يُعثر على أكواد ISBN صالحة في الملف', 'error');
          setStatusText('جاهز للمعالجة');
          return;
        }

        setRawData(isbns);
        setFileName(file.name);
        setFileMeta(`${isbns.length} كود ISBN · ${(file.size / 1024).toFixed(1)} KB`);
        showToast(`تم قراءة ${isbns.length} كود ISBN بنجاح`, 'success');
        addActivity(`📂 رُفع ملف: ${file.name} — ${isbns.length} ISBN`, 'success');
        setStatusText('الملف جاهز · اضغط "بدء المعالجة"');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطأ غير معروف';
        showToast(`خطأ في قراءة الملف: ${message}`, 'error');
        addActivity(`💥 خطأ في قراءة الملف: ${message}`, 'error');
        setStatusText('جاهز للمعالجة');
      }
    },
    [showToast, addActivity]
  );

  const handleLoadSample = useCallback(() => {
    setRawData(SAMPLE_ISBNS);
    setFileName('sample_isbns.xlsx (تجريبي)');
    setFileMeta(`${SAMPLE_ISBNS.length} كود ISBN · بيانات تجريبية`);
    showToast(`تم تحميل ${SAMPLE_ISBNS.length} ISBN تجريبي`, 'success');
    addActivity(`📋 تم تحميل ${SAMPLE_ISBNS.length} ISBN تجريبي`, 'info');
    setStatusText('الملف جاهز · اضغط "بدء المعالجة"');
  }, [showToast, addActivity]);

  const startProcessing = useCallback(async () => {
    if (isProcessing) return;
    if (rawData.length === 0) {
      showToast('يرجى رفع ملف Excel أولاً', 'warning');
      return;
    }

    setIsProcessing(true);
    setHasStarted(true);
    setShowSummary(false);
    shouldStopRef.current = false;
    rateLimiterRef.current = createRateLimiterState();

    const total = rawData.length;
    let processed = 0;
    let success = 0;
    let failed = 0;
    const seen = new Set<string>();
    const toFetch: { index: number; isbn: string }[] = [];

    setResults(new Array(total).fill(undefined));
    setStats({ processed: 0, total, success: 0, failed: 0 });
    setStatusText(`بدء معالجة ${total} ISBN...`);
    addActivity(`🚀 بدأت معالجة ${total} ISBN`, 'info');
    showToast(`جاري معالجة ${total} كود ISBN`, 'info');

    const commit = (index: number, data: BookData) => {
      setResults((prev) => {
        const next = prev.length === total ? [...prev] : new Array(total).fill(undefined);
        next[index] = data;
        return next;
      });
    };

    // المرحلة 1: تحقق من الصحة + التكرار + الكاش — كلها محلية وفورية (بدون شبكة)
    rawData.forEach((isbn, index) => {
      const validation = validateISBN(isbn);

      if (!validation.valid) {
        commit(index, { isbn, found: false, reason: validation.reason, validationError: true });
        failed++;
        processed++;
        addActivity(`❌ ISBN غير صالح: ${isbn} — ${validation.reason}`, 'error');
        return;
      }

      if (seen.has(isbn)) {
        commit(index, { isbn, found: false, reason: 'كود ISBN مكرر', duplicate: true });
        failed++;
        processed++;
        addActivity(`⚠️ مكرر: ${isbn}`, 'warn');
        return;
      }
      seen.add(isbn);

      const cached = resultsCache.get(isbn);
      if (cached) {
        commit(index, cached);
        cached.found ? success++ : failed++;
        processed++;
        addActivity(`📦 كاش: ${isbn}`, 'info');
        return;
      }

      toFetch.push({ index, isbn });
    });

    setStats({ processed, total, success, failed });

    // المرحلة 2: اجلب الباقي من الشبكة على دفعات عبر /api/books
    const batches = chunkArray(toFetch, BATCH_SIZE);

    for (const batch of batches) {
      if (shouldStopRef.current) break;

      await scheduleRequest(rateLimiterRef.current, OL_MIN_GAP_MS);
      if (shouldStopRef.current) break;

      const batchIsbns = batch.map((item) => item.isbn);
      setStatusText(`جاري جلب دفعة (${batchIsbns.length} كتاب) في طلب واحد...`);
      addActivity(`📚 إرسال دفعة: ${batchIsbns.length} ISBN في طلب HTTP واحد`, 'info');

      let outcomes: Record<string, BookData> = {};

      try {
        const res = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isbns: batchIsbns }),
        });
        const json = (await res.json()) as BooksApiResponseBody & { error?: string };
        if (!res.ok) throw new Error(json?.error || 'فشل الطلب');
        outcomes = json.outcomes;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'فشل الطلب';
        batchIsbns.forEach((isbn) => {
          outcomes[isbn] = { isbn, found: false, reason: message };
        });
      }

      batch.forEach(({ index, isbn }) => {
        const data: BookData = outcomes[isbn] || { isbn, found: false, reason: 'لا توجد بيانات' };
        resultsCache.set(isbn, data);
        commit(index, data);

        if (data.found) {
          success++;
          addActivity(`✅ ${(data.title || '').substring(0, 40)} — ${isbn}`, 'success');
        } else {
          failed++;
          addActivity(`❌ لم يُعثر على: ${isbn} — ${data.reason}`, 'error');
        }
        processed++;
      });

      setStats({ processed, total, success, failed });
    }

    setIsProcessing(false);

    if (!shouldStopRef.current) {
      setStatusText('اكتملت المعالجة');
      addActivity(`🎉 اكتملت المعالجة: ${success} نجاح, ${failed} فشل`, 'success');
      showToast(`اكتملت المعالجة! ${success} كتاب تم جلبه 🎉`, 'success', 5000);
    }

    setShowSummary(true);
  }, [isProcessing, rawData, showToast, addActivity]);

  const stopProcessing = useCallback(() => {
    shouldStopRef.current = true;
    setIsProcessing(false);
    setStatusText('تم إيقاف المعالجة');
    addActivity('⏹ تم إيقاف المعالجة من قبل المستخدم', 'warn');
    showToast('تم إيقاف المعالجة', 'warning');
    setShowSummary(true);
  }, [addActivity, showToast]);

  const resetAll = useCallback(() => {
    // ملاحظة: لا نُفرّغ resultsCache عمداً هنا — راجع lib/cache.ts
    shouldStopRef.current = true;
    setIsProcessing(false);
    setHasStarted(false);
    setShowSummary(false);
    setRawData([]);
    setFileName('');
    setFileMeta('');
    setResults([]);
    setActivity([]);
    setStats({ processed: 0, total: 0, success: 0, failed: 0 });
    setStatusText('جاهز للمعالجة');
    showToast('تم إعادة الضبط', 'info');
  }, [showToast]);

  const warningCount = useMemo(
    () => results.filter((r) => r && (r.duplicate || r.validationError)).length,
    [results]
  );

  return (
    <>
      <UploadZone onFileSelected={handleFileSelected} onLoadSample={handleLoadSample} />

      {rawData.length > 0 && (
        <FileInfoCard
          fileName={fileName}
          fileMeta={fileMeta}
          onStartProcessing={startProcessing}
          onReset={resetAll}
          processingDisabled={isProcessing}
        />
      )}

      <div className="main-content">
        {rawData.length > 0 && <FieldSelector selectedFields={selectedFields} onChange={setSelectedFields} />}

        {hasStarted && (
          <ProcessingPanel stats={stats} status={status} isProcessing={isProcessing} activity={activity} />
        )}

        {hasStarted && (
          <div className="controls-row">
            <ExportButtons results={results} selectedFields={selectedFields} disabled={stats.success === 0} />
            <button type="button" className="btn btn-secondary" onClick={resetAll}>
              <RotateCcw size={18} strokeWidth={2} /> بدء من جديد
            </button>
            {isProcessing && (
              <button type="button" className="btn btn-secondary" onClick={stopProcessing}>
                <CirclePause size={18} strokeWidth={2} /> إيقاف
              </button>
            )}
          </div>
        )}

        {showSummary && <SummaryGrid stats={stats} warningCount={warningCount} />}

        {hasStarted && <ResultsGrid isbns={rawData} results={results} selectedFields={selectedFields} />}
      </div>

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}${t.exiting ? ' exit' : ''}`}>
            <span className="toast-icon">{TOAST_ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
