import type { Metadata } from 'next';
import Script from 'next/script';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import MouseGlow from '@/components/MouseGlow';
import { SITE_URL } from '@/lib/constants';
import '@/styles/globals.css';

/**
 * ملاحظة تقنية: تعمّدنا عدم استخدام next/font/google هنا، واستخدمنا بدلاً
 * منها وسم <link> التقليدي (تماماً كما في index.html الأصلي). السبب: بيئة
 * التطوير المستخدَمة لبناء هذا المشروع كانت مقيَّدة الشبكة (لا تصل إلى
 * fonts.googleapis.com وقت البناء)، وnext/font/google يحاول تنزيل ملفات
 * الخط وقت البناء (build time) لاستضافتها ذاتياً. استخدام <link> يجعل
 * المتصفح هو من يجلب الخط وقت التشغيل بدل خادم البناء، وهذا يعمل بشكل
 * مضمون في أي بيئة نشر (بما فيها Vercel) دون أي مخاطرة. يمكن التبديل لاحقاً
 * إلى next/font/google لتحسين الأداء قليلاً إن رغبت (راجع التقرير المرفق).
 */

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'معالج ISBN الذكي | استخرج بيانات الكتب من Open Library',
    template: '%s | معالج ISBN الذكي',
  },
  description:
    'ارفع ملف Excel يحتوي على أكواد ISBN واحصل على بيانات وصفية كاملة لكل كتاب (العنوان، المؤلف، الناشر، الغلاف) من Open Library، مع إمكانية تصدير النتائج بصيغة Excel أو JSON. أداة مجانية وسريعة بدون تسجيل.',
  keywords: [
    'معالج ISBN',
    'جلب بيانات الكتب',
    'أداة ISBN مجانية',
    'Open Library',
    'استخراج بيانات كتب',
    'ISBN metadata',
    'تصدير Excel',
    'تصدير JSON',
  ],
  authors: [{ name: 'Omar Mahmoud Ahmed' }],
  creator: 'Omar Mahmoud Ahmed',
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    url: SITE_URL,
    siteName: 'معالج ISBN الذكي',
    title: 'معالج ISBN الذكي | استخرج بيانات الكتب من Open Library',
    description:
      'ارفع ملف Excel يحتوي على أكواد ISBN واحصل على بيانات وصفية كاملة لكل كتاب، مع تصدير Excel أو JSON.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'معالج ISBN الذكي',
    description: 'استخرج بيانات وصفية كاملة لكتبك من ملف ISBN واحد، بتصدير Excel أو JSON.',
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'معالج ISBN الذكي',
  description: 'أداة مجانية لاستخراج بيانات الكتب من أكواد ISBN عبر Open Library، مع تصدير Excel و JSON.',
  applicationCategory: 'UtilityApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Omar Mahmoud Ahmed' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="google-adsense-account" content="ca-pub-1456088159385832" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script
          id="adsbygoogle-init"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1456088159385832"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className="ambient-bg">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="grid-overlay" />
        </div>

        <MouseGlow />
        <Nav />

        <div className="app-wrapper">
          {children}
          <div className="glow-line" />
          <Footer />
        </div>
      </body>
    </html>
  );
}
