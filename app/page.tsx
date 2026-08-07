import HeroSection from '@/components/HeroSection';
import AdsSection from '@/components/AdsSection';
import IsbnProcessorApp from '@/components/IsbnProcessorApp';

// الصفحة الرئيسية تُبنى بشكل ثابت بالكامل (SSG) — لا تعتمد على أي بيانات
// خادم وقت الطلب، كل التفاعل يحدث في المتصفح بعد التحميل.
export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <AdsSection slot="top" />
      <IsbnProcessorApp />
    </main>
  );
}
