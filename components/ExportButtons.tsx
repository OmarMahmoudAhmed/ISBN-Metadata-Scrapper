'use client';

import { useState } from 'react';
import { Table2, FileJson } from 'lucide-react';
import type { BookData, FieldKey } from '@/lib/types';
import { buildExportRows } from '@/lib/export';
import { downloadJSON, buildExportFilename } from '@/lib/utils';

interface ExportButtonsProps {
  results: Array<BookData | undefined>;
  selectedFields: FieldKey[];
  disabled: boolean;
}

export default function ExportButtons({ results, selectedFields, disabled }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<'excel' | 'json' | null>(null);

  const handleExportExcel = async () => {
    const rows = buildExportRows(results, selectedFields);
    if (!rows.length) return;

    setExporting('excel');
    try {
      // استيراد ديناميكي لمكتبة xlsx حتى لا تُحمَّل مع الحزمة الرئيسية
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, 'ISBN Results');
      XLSX.writeFile(wb, buildExportFilename('xlsx'));
    } finally {
      setExporting(null);
    }
  };

  const handleExportJSON = () => {
    const rows = buildExportRows(results, selectedFields);
    if (!rows.length) return;

    setExporting('json');
    try {
      downloadJSON(rows, buildExportFilename('json'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-success"
        onClick={handleExportExcel}
        disabled={disabled || exporting !== null}
      >
        <Table2 size={18} strokeWidth={2} /> تصدير Excel
      </button>
      <button
        type="button"
        className="btn btn-success"
        onClick={handleExportJSON}
        disabled={disabled || exporting !== null}
      >
        <FileJson size={18} strokeWidth={2} /> تصدير JSON
      </button>
    </>
  );
}
