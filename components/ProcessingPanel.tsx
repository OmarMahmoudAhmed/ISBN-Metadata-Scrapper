import type { ActivityItem, ProcessingStats } from '@/lib/types';
import ActivityLog from './ActivityLog';

interface ProcessingPanelProps {
  stats: ProcessingStats;
  status: string;
  isProcessing: boolean;
  activity: ActivityItem[];
}

const CIRCUMFERENCE = 314; // ≈ 2 × π × 50 (نفس قيمة stroke-dasharray الأصلية)

export default function ProcessingPanel({ stats, status, isProcessing, activity }: ProcessingPanelProps) {
  const pct = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  const remaining = stats.total - stats.processed;

  return (
    <div className="processing-panel">
      <div className="panel-header">
        <span className="panel-title">معالجة البيانات</span>
        <span className="panel-badge">{remaining > 0 ? `متبقي ${remaining}` : 'مكتمل ✓'}</span>
      </div>

      <div className="progress-card">
        <div className="circular-progress">
          <svg className="circle-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4DEBFF" />
                <stop offset="100%" stopColor="#B155FF" />
              </linearGradient>
            </defs>
            <circle className="circle-bg" cx="60" cy="60" r="50" />
            <circle
              className="circle-fill"
              cx="60"
              cy="60"
              r="50"
              style={{ strokeDashoffset: offset }}
            />
          </svg>
          <div className="circle-text">
            <div className="circle-pct">{pct}%</div>
            <div className="circle-label">مكتمل</div>
          </div>
        </div>

        <div>
          <div className="processing-stats">
            <div className="stat-block">
              <div className="stat-value cyan">{stats.processed}</div>
              <div className="stat-key">تمت معالجته</div>
            </div>
            <div className="stat-block">
              <div className="stat-value purple">{stats.total}</div>
              <div className="stat-key">إجمالي</div>
            </div>
            <div className="stat-block">
              <div className="stat-value green">{stats.success}</div>
              <div className="stat-key">ناجح</div>
            </div>
            <div className="stat-block">
              <div className="stat-value pink">{stats.failed}</div>
              <div className="stat-key">فشل</div>
            </div>
          </div>

          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="status-message">
            <div className="status-pulse" style={isProcessing ? undefined : { animation: 'none' }} />
            <span>{status}</span>
          </div>
        </div>
      </div>

      <ActivityLog items={activity} />
    </div>
  );
}
