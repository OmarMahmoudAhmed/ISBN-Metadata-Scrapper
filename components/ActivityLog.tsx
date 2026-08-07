import type { ActivityItem } from '@/lib/types';

interface ActivityLogProps {
  items: ActivityItem[];
}

export default function ActivityLog({ items }: ActivityLogProps) {
  return (
    <div className="activity-panel">
      {items.length === 0 ? (
        <div className="activity-item">
          <div className="activity-dot info" />
          <div className="activity-text">في انتظار ملف Excel...</div>
          <div className="activity-time">الآن</div>
        </div>
      ) : (
        items.map((item) => (
          <div className="activity-item" key={item.id}>
            <div className={`activity-dot ${item.type}`} />
            <div className="activity-text">{item.text}</div>
            <div className="activity-time">{item.time}</div>
          </div>
        ))
      )}
    </div>
  );
}
