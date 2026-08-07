import { LibraryBig } from 'lucide-react';

/**
 * Nav — شريط تنقل ثابت (Server Component) يظهر في كل الصفحات عبر layout.tsx.
 * لا يعرض حالة معالجة حيّة (كما كان navStatus في النسخة الأصلية) عمداً:
 * حالة المعالجة تخص أداة ISBN فقط، وربطها بشريط تنقل عابر لكل الصفحات
 * يتطلب Context عالمي لا يستحق التعقيد الإضافي مقابل فائدة بصرية بسيطة.
 * لوحة المعالجة نفسها (ProcessingPanel) تعرض الحالة الحيّة بوضوح تام.
 */
export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-logo">
        <div className="logo-icon">
          <LibraryBig size={20} strokeWidth={2} />
        </div>
        <span className="logo-text">ISBN Processor</span>
        <span className="logo-version">v2.0</span>
      </div>
      <div className="nav-status">
        <div className="status-dot" />
        <span>Open Library</span>
      </div>
    </nav>
  );
}
