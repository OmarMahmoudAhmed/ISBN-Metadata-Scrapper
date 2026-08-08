'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { BookData, FieldKey } from '@/lib/types';

interface ResultCardProps {
  isbn: string;
  index: number;
  data?: BookData;
  selectedFields: FieldKey[];
  visible: boolean;
}

export default function ResultCard({ isbn, index, data, selectedFields, visible }: ResultCardProps) {
  const [imgError, setImgError] = useState(false);
  const hiddenStyle = visible ? undefined : { display: 'none' as const };
  const has = (key: FieldKey) => selectedFields.includes(key);

  if (!data) {
    return (
      <div
        className="result-card"
        style={{ ...hiddenStyle, animationDelay: `${Math.min(index * 0.05, 1)}s` }}
      >
        <div className="card-cover-row">
          <div className="card-cover skeleton" style={{ width: 56, height: 76 }} />
          <div className="card-meta">
            <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '60%', marginBottom: 10 }} />
            <span className="status-badge badge-processing">⚙️ معالجة...</span>
          </div>
        </div>
        <div className="isbn-badge">🔖 {isbn}</div>
      </div>
    );
  }

  let statusClass = 'status-error';
  let badgeClass = 'badge-error';
  let statusText = 'لم يُعثر عليه';
  let statusIcon = '❌';

  if (data.validationError) {
    statusClass = 'status-error';
    badgeClass = 'badge-error';
    statusText = 'غير صالح';
    statusIcon = '❌';
  } else if (data.duplicate) {
    statusClass = 'status-warning';
    badgeClass = 'badge-warning';
    statusText = 'مكرر';
    statusIcon = '⚠️';
  } else if (data.found) {
    statusClass = 'status-success';
    badgeClass = 'badge-success';
    statusText = 'تم الجلب';
    statusIcon = '✅';
  }

  const showThumbnail = has('thumbnail') && Boolean(data.thumbnail) && !imgError;

  return (
    <div className={`result-card ${statusClass}`} style={hiddenStyle}>
      <div className="card-cover-row">
        <div className="card-cover">
          {showThumbnail ? (
            <Image
              src={data.thumbnail as string}
              alt={data.title || isbn}
              width={56}
              height={76}
              style={{ objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          ) : (
            '📖'
          )}
        </div>
        <div className="card-meta">
          <div className="card-title">{data.title || data.reason || 'غير متوفر'}</div>
          <div className="card-author">
            {has('authors') && data.authors ? data.authors : data.reason ? `⚠️ ${data.reason}` : '—'}
          </div>
          <span className={`status-badge ${badgeClass}`}>
            {statusIcon} {statusText}
          </span>
        </div>
      </div>

      {data.found && (
        <div className="card-data-grid">
          {has('publisher') && (
            <div className="data-item">
              <div className="data-key">الناشر</div>
              <div className="data-val">{data.publisher || '—'}</div>
            </div>
          )}
          {has('publishedDate') && (
            <div className="data-item">
              <div className="data-key">سنة النشر</div>
              <div className="data-val">{data.publishedDate || '—'}</div>
            </div>
          )}
          {has('pageCount') && (
            <div className="data-item">
              <div className="data-key">عدد الصفحات</div>
              <div className="data-val">{data.pageCount ?? '—'}</div>
            </div>
          )}
          {has('language') && (
            <div className="data-item">
              <div className="data-key">اللغة</div>
              <div className="data-val">{data.language || '—'}</div>
            </div>
          )}
          {has('categories') && (
            <div className="data-item">
              <div className="data-key">التصنيف</div>
              <div className="data-val">{data.categories || '—'}</div>
            </div>
          )}
          {has('source') && (
            <div className="data-item">
              <div className="data-key">المصدر</div>
              <div className="data-val">{data.source || '—'}</div>
            </div>
          )}
        </div>
      )}

      <div className="isbn-badge">🔖 {data.isbn}</div>
    </div>
  );
}
