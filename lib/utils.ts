/**
 * utils.ts — دوال مساعدة عامة لا ترتبط بمجال عمل محدد
 */

/** sleep — دالة انتظار مؤقت (تُستخدم في بوابة تنظيم الطلبات) */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * downloadJSON — يُنشئ ملف JSON من كائن/مصفوفة ويُحفّز تحميله في المتصفح
 * عبر Blob + URL.createObjectURL (بدون أي طلب شبكة أو تخزين على الخادم).
 */
export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** يبني اسم ملف بصيغة isbn_results_YYYY-MM-DD مع الامتداد المطلوب */
export function buildExportFilename(extension: 'xlsx' | 'json'): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `isbn_results_${timestamp}.${extension}`;
}
