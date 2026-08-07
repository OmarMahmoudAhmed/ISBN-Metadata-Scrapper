import { sleep } from './utils';

/**
 * rate-limiter.ts — بوابة تنظيم الطلبات (client-side)
 *
 * لماذا على العميل تحديداً وليس على الخادم:
 * كل طلب لـ /api/books هو استدعاء خادم بدون حالة (stateless) — في بيئة
 * serverless لا يوجد ضمان بأن نفس نسخة الدالة ستُستدعى مرتين متتاليتين
 * لتتبع "آخر وقت طلب" بشكل موثوق عبر طلبات متعددة، ولا نريد قاعدة بيانات
 * أو Redis لتنسيق ذلك (بحسب متطلبات المشروع). لذلك التوقيت بين الدفعات
 * (~1 طلب/ثانية) يبقى مسؤولية المتصفح تماماً كما كان في النسخة الأصلية،
 * التي كانت بالكامل من جانب العميل.
 *
 * الحالة (state) تُمرَّر كمعامل بدل الاعتماد على متغيرات على مستوى الوحدة
 * (module-level) لتجنّب أي حالة مشتركة عالمياً — كل جلسة معالجة تبدأ بحالة
 * جديدة نظيفة عبر createRateLimiterState().
 */

export interface RateLimiterState {
  chain: Promise<void>;
  lastTimestamp: number;
}

export function createRateLimiterState(): RateLimiterState {
  return { chain: Promise.resolve(), lastTimestamp: 0 };
}

/** ينتظر دوره في الطابور ثم يضمن مرور minGapMs على الأقل منذ آخر طلب */
export function scheduleRequest(state: RateLimiterState, minGapMs: number): Promise<void> {
  const turn = state.chain.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, state.lastTimestamp + minGapMs - now);
    if (wait > 0) await sleep(wait);
    state.lastTimestamp = Date.now();
  });
  // نتجاهل الأخطاء في السلسلة الداخلية حتى لا يفشل طلب لاحق بسبب فشل سابق
  state.chain = turn.catch(() => undefined);
  return turn;
}
