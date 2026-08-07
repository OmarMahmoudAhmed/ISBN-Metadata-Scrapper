'use client';

import { useRef, useState } from 'react';
import { Upload, FileCheck, Boxes } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
}

export default function UploadZone({ onFileSelected, onLoadSample }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="upload-section">
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFileSelected(file);
        }}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="اسحب ملف Excel هنا أو اضغط للاختيار"
      >
        <div className="upload-icon-wrap">
          <Upload size={26} strokeWidth={2} />
        </div>
        <div className="upload-title">اسحب ملف Excel هنا</div>
        <div className="upload-sub">
          يدعم ملفات .xlsx و .xls
          <br />
          يجب أن يحتوي العمود الأول على أكواد ISBN
        </div>
        <div className="upload-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
          >
            <FileCheck size={18} strokeWidth={2} /> اختر ملفاً
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onLoadSample();
            }}
          >
            <Boxes size={18} strokeWidth={2} /> بيانات تجريبية
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
