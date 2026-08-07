import { Table2, Cpu, X } from 'lucide-react';

interface FileInfoCardProps {
  fileName: string;
  fileMeta: string;
  onStartProcessing: () => void;
  onReset: () => void;
  processingDisabled: boolean;
}

export default function FileInfoCard({
  fileName,
  fileMeta,
  onStartProcessing,
  onReset,
  processingDisabled,
}: FileInfoCardProps) {
  return (
    <div className="file-info-card">
      <div className="file-info-inner">
        <div className="file-icon-badge">
          <Table2 size={22} strokeWidth={2} />
        </div>
        <div className="file-details">
          <div className="file-name">{fileName}</div>
          <div className="file-meta">{fileMeta}</div>
        </div>
        <div className="file-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onStartProcessing}
            disabled={processingDisabled}
          >
            <Cpu size={18} strokeWidth={2} /> بدء المعالجة
          </button>
          <button type="button" className="btn btn-secondary" onClick={onReset} aria-label="إزالة الملف">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
