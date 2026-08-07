'use client';

import { useState } from 'react';
import type { BookData, FieldKey, FilterType } from '@/lib/types';
import ResultCard from './ResultCard';

interface ResultsGridProps {
  isbns: string[];
  results: Array<BookData | undefined>;
  selectedFields: FieldKey[];
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'success', label: 'ناجح' },
  { key: 'error', label: 'فشل' },
  { key: 'warning', label: 'تحذير' },
];

export default function ResultsGrid({ isbns, results, selectedFields }: ResultsGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const isVisible = (data?: BookData) => {
    if (!data) return true; // بطاقة skeleton ما زالت قيد الجلب — تبقى مرئية دائماً
    if (filter === 'success') return data.found === true;
    if (filter === 'error') return data.found === false && !data.duplicate;
    if (filter === 'warning') return data.duplicate === true || data.validationError === true;
    return true;
  };

  return (
    <div className="results-section">
      <div className="section-header">
        <span className="section-title">النتائج</span>
        <div className="filters-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="results-grid">
        {isbns.map((isbn, index) => (
          <ResultCard
            key={`${isbn}-${index}`}
            isbn={isbn}
            index={index}
            data={results[index]}
            selectedFields={selectedFields}
            visible={isVisible(results[index])}
          />
        ))}
      </div>
    </div>
  );
}
