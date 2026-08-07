/**
 * HeroSection — محتوى ثابت (Server Component، بدون 'use client') يُصدَّر
 * كـ HTML ثابت بالكامل عند البناء (SSG)، وهو ما يقرأه Google مباشرة دون
 * الحاجة لتشغيل JavaScript — يحقق متطلب "فقرات وصفية تشرح الخدمة" في
 * مواصفات SEO لِـ v2.
 */
export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-badge">⚡ AI-Powered Metadata Engine</div>
      <h1 className="hero-title">
        معالج بيانات
        <br />
        <span className="gradient-text">ISBN الذكي</span>
      </h1>
      <p className="hero-subtitle">
        أداة مجانية لمعالجة أرقام ISBN واستخراج بيانات الكتب من Open Library. ارفع ملف Excel
        يحتوي على الأرقام واحصل فوراً على العنوان والمؤلف والناشر وصورة الغلاف وبيانات أخرى لكل
        كتاب، مع تحديد الحقول التي تريدها وتصدير النتائج بصيغة Excel أو JSON — مجاناً وبدون تسجيل.
      </p>

      <div className="stats-row">
        <div className="stat-pill">
          معالجة <strong>1000+</strong> ISBN
        </div>
        <div className="stat-pill">
          دفعات <strong>×25</strong> لكل طلب
        </div>
        <div className="stat-pill">
          كاش <strong>ذكي</strong>
        </div>
        <div className="stat-pill">
          تصدير <strong>Excel / JSON</strong>
        </div>
      </div>
    </section>
  );
}
