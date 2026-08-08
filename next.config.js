/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      // أغلفة Google Books
      { protocol: 'https', hostname: 'books.google.com' },
      { protocol: 'https', hostname: 'books.googleusercontent.com' },
      // صور Wikidata (P18) تُحل عبر Special:FilePath على هذا النطاق، وقد
      // تُعاد توجيهها فعلياً إلى upload.wikimedia.org — كلاهما مُضاف احتياطاً.
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
};

module.exports = nextConfig;
