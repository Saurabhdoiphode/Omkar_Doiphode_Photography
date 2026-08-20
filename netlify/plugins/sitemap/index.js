const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = 'public';

const BASE_URL = process.env.SITE_URL || 'https://omkardoiphodephotography.netlify.app';

const STATIC_PAGES = [
  '',
  '/admin',
  '/client-gallery.html',
];

const EXCLUDE = new Set(['admin-dashboard.html', 'admin-login.html']);

function getHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  let pages = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      pages = pages.concat(getHtmlFiles(full));
    } else if (file.endsWith('.html') && !EXCLUDE.has(file)) {
      const rel = path.relative(PUBLIC_DIR, full).replace(/\\/g, '/');
      pages.push('/' + rel.replace(/index\.html$/, ''));
    }
  }
  return pages;
}

module.exports = {
  onPostBuild: async ({ utils }) => {
    const publishDir = utils.build.publishDir || PUBLIC_DIR;

    const dynamicPages = getHtmlFiles(publishDir);
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

    const outPath = path.join(publishDir, 'sitemap.xml');
    fs.writeFileSync(outPath, sitemap, 'utf-8');
    console.log(`[netlify-plugin-sitemap] sitemap.xml written to ${outPath} (${allPages.length} URLs)`);
  },
};