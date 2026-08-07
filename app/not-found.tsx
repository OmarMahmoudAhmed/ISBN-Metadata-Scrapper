import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty-state" style={{ paddingTop: 160 }}>
      <div className="empty-icon" aria-hidden="true">
        📖
      </div>
      <div className="empty-title">الصفحة غير موجودة</div>
      <div className="empty-sub">عذراً، الصفحة التي تبحث عنها غير متوفرة.</div>
      <Link href="/" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
        العودة للرئيسية
      </Link>
    </div>
  );
}
