export default async (request, context) => {
  const PUBLIC_DIR = 'public';
  const BASE_URL = 'https://omkardoiphodephotography.netlify.app';

  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const STATIC_PAGES = ['', '/admin', '/client-gallery.html'];
  const EXCLUDE = new Set(['admin-dashboard.html', 'admin-login.html']);

  function getHtmlFiles(dir) {
    const fsSync = await import('node:fs');
    const pathSync = await import('node:path');
    const files = fsSync.readdirSync(dir);
    let pages = [];
    for (const file of files) {
      const full = pathSync.join(dir, file);
      const stat = fsSync.statSync(full);
      if (stat.isDirectory()) {
        pages = pages.concat(getHtmlFiles(full));
      } else if (file.endsWith('.html') && !EXCLUDE.has(file)) {
        const rel = pathSync.relative(PUBLIC_DIR, full).replace(/\\/g, '/');
        pages.push('/' + rel.replace(/index\.html$/, ''));
      }
    }
    return pages;
  }

  const dynamicPages = getHtmlFiles(PUBLIC_DIR);
  const allPages = [...new Set([...STATIC_PAGES, ...dynamicPages])];

  const urls = allPages
    .map(p => {
      const url = `${BASE_URL}${p || '/'}`;
      return `  <url><loc>${url}</loc><changefreq>weekly</changefreq><priority>${p === '' ? '1.0' : '0.8'}</priority></url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};