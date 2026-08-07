'use client';

import { useEffect, useState } from 'react';

interface AdsSectionProps {
  slot?: string;
}

/**
 * AdsSection — حاوية إعلانية جاهزة (Placeholder) لربطها لاحقاً بشبكة
 * إعلانات حقيقية (AdSense للويب / AdMob للموبايل عبر Capacitor).
 *
 * ملاحظة: في index.html الأصلي، كانت هذه المنطقة تحتوي HTML غير مكتمل
 * (وسم </div> و</span> يتيمان بدون فتح مقابل، وتعليقان مكرران
 * "END ADS AD UNIT")، ولم يكن هناك عنصر بمعرّف adSlotTopText الذي كانت
 * دالة initAdSlots() تبحث عنه — أي أن شارة "مساحة إعلانية" لم تكن تُعرض
 * فعلياً رغم وجود كل الأنماط (CSS) الخاصة بها جاهزة. تم إكمال ذلك هنا
 * باستخدام نفس فئات CSS الأصلية (ad-slot, ad-slot-label, ad-slot-icon).
 */
export default function AdsSection({ slot = 'top' }: AdsSectionProps) {
  const [label, setLabel] = useState('مساحة إعلانية — سيتم التفعيل لاحقاً');

  useEffect(() => {
    const nativePlatform = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    const isNativeApp = !!(nativePlatform?.isNativePlatform && nativePlatform.isNativePlatform());

    setLabel(
      isNativeApp
        ? 'مساحة إعلانية (AdMob) — سيتم التفعيل لاحقاً'
        : 'مساحة إعلانية (AdSense) — سيتم التفعيل لاحقاً'
    );
  }, []);

  return (
    <section className="ad-section" aria-label="مساحة إعلانية" data-slot={slot}>
      <div className="ad-slot">
        <span className="ad-slot-label">إعلان</span>
        <span className="ad-slot-icon" aria-hidden="true">
          📢
        </span>
        <span>{label}</span>
      </div>
    </section>
  );
}
