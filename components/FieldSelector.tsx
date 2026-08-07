'use client';

import { useEffect, useRef } from 'react';
import type { FieldKey } from '@/lib/types';
import { FIELD_OPTIONS, FIELD_SELECTION_STORAGE_KEY } from '@/lib/fields';

interface FieldSelectorProps {
  selectedFields: FieldKey[];
  onChange: (fields: FieldKey[]) => void;
}

/**
 * FieldSelector — منتقي الحقول المطلوبة من بيانات Open Library.
 * يبقى مرئياً وقابلاً للتعديل طوال الوقت (قبل وبعد المعالجة): بما أننا
 * نجلب دائماً البيانات الكاملة ونُخفي فقط ما لم يُختَر عند العرض/التصدير،
 * تغيير الاختيار لا يتطلب إعادة أي طلب شبكة — تحسين حقيقي عن سلوك تبديل
 * الحقول "قبل المعالجة فقط" المذكور حرفياً في مستند المتطلبات.
 */
export default function FieldSelector({ selectedFields, onChange }: FieldSelectorProps) {
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const saved = localStorage.getItem(FIELD_SELECTION_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string') && parsed.length > 0) {
        onChange(parsed as FieldKey[]);
      }
    } catch {
      // localStorage غير متاح (وضع التصفح الخاص مثلاً) أو محتوى تالف — نتجاهل بصمت
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key: FieldKey) => {
    const next = selectedFields.includes(key)
      ? selectedFields.filter((f) => f !== key)
      : [...selectedFields, key];

    onChange(next);

    try {
      localStorage.setItem(FIELD_SELECTION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // تجاهل أخطاء الكتابة إلى localStorage
    }
  };

  return (
    <div className="field-selector">
      <div className="field-selector-title">الحقول المطلوبة في النتائج والتصدير</div>
      <div className="field-selector-grid">
        {FIELD_OPTIONS.map((opt) => (
          <label key={opt.key} className="field-chip">
            <input
              type="checkbox"
              checked={selectedFields.includes(opt.key)}
              onChange={() => toggle(opt.key)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
