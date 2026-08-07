/**
 * constants.ts — ثوابت عامة على مستوى المشروع
 */

/** رابط الموقع الفعلي — يُستخدم في sitemap.xml و robots.txt و Open Graph و JSON-LD */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://isbn-processor.vercel.app';

/** نفس مجموعة ISBNs التجريبية من المحرك الأصلي (loadSampleData) */
export const SAMPLE_ISBNS: string[] = [
  '9780544003415', // The Hobbit
  '9780451524935', // 1984 - George Orwell
  '9780743273565', // The Great Gatsby
  '9780061965081', // To Kill a Mockingbird
  '9780385737951', // The Maze Runner
  '9780439023481', // The Hunger Games
  '9780316769174', // The Catcher in the Rye
  '9780307474278', // The Da Vinci Code
  '9780679720201', // Crime and Punishment
  '9780062315007', // The Alchemist
];
