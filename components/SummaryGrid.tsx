import { Rows4, SearchCheck, CircleX, CircleAlert } from 'lucide-react';
import type { ProcessingStats } from '@/lib/types';

interface SummaryGridProps {
  stats: ProcessingStats;
  warningCount: number;
}

export default function SummaryGrid({ stats, warningCount }: SummaryGridProps) {
  return (
    <div className="summary-grid">
      <div className="summary-card">
        <div className="summary-icon">
          <Rows4 size={20} strokeWidth={2} />
        </div>
        <div className="summary-value cyan">{stats.total}</div>
        <div className="summary-label">إجمالي ISBNs</div>
      </div>
      <div className="summary-card">
        <div className="summary-icon">
          <SearchCheck size={20} strokeWidth={2} />
        </div>
        <div className="summary-value green">{stats.success}</div>
        <div className="summary-label">تم جلبها</div>
      </div>
      <div className="summary-card">
        <div className="summary-icon">
          <CircleX size={20} strokeWidth={2} />
        </div>
        <div className="summary-value pink">{stats.failed}</div>
        <div className="summary-label">فشلت</div>
      </div>
      <div className="summary-card">
        <div className="summary-icon">
          <CircleAlert size={20} strokeWidth={2} />
        </div>
        <div className="summary-value" style={{ color: 'var(--yellow)' }}>
          {warningCount}
        </div>
        <div className="summary-label">تحذيرات</div>
      </div>
    </div>
  );
}
