/**
 * types.ts — تعريفات TypeScript المشتركة بين lib/ و components/ و app/
 */

/** بيانات كتاب واحد بالصيغة الموحدة المستخدمة في كل الواجهة */
export interface BookData {
  isbn: string;
  found: boolean;
  title?: string;
  authors?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number | null;
  language?: string;
  thumbnail?: string | null;
  categories?: string;
  source?: string;
  /** سبب الفشل أو عدم العثور على الكتاب (لعرضه للمستخدم وللتصدير) */
  reason?: string;
  duplicate?: boolean;
  validationError?: boolean;
}

/** الشكل الخام لبيانات كتاب كما يُعيدها Open Library (jscmd=data) */
export interface OpenLibraryBookInfo {
  title?: string;
  authors?: { name?: string }[];
  publishers?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
  subjects?: { name?: string }[];
}

/** الحقول القابلة للاختيار في منتقي الحقول (Field Selector) */
export type FieldKey =
  | 'title'
  | 'authors'
  | 'publisher'
  | 'publishedDate'
  | 'pageCount'
  | 'thumbnail'
  | 'language'
  | 'categories';

export type FilterType = 'all' | 'success' | 'error' | 'warning';
export type ActivityType = 'success' | 'error' | 'info' | 'warn';
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ActivityItem {
  id: string;
  text: string;
  type: ActivityType;
  time: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

export interface ProcessingStats {
  processed: number;
  total: number;
  success: number;
  failed: number;
}

/** جسم الطلب المُرسَل إلى POST /api/books */
export interface BooksApiRequestBody {
  isbns: string[];
}

/** جسم الاستجابة القادم من POST /api/books */
export interface BooksApiResponseBody {
  outcomes: Record<string, BookData>;
}

export interface BooksApiErrorBody {
  error: string;
}
