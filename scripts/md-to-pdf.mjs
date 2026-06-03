// Convert docs/lab-orders-guide.md -> docs/lab-orders-guide.pdf
// Embeds images by reading them from disk relative to the markdown.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const MD_PATH  = path.resolve('docs/lab-orders-guide.md');
const PDF_PATH = path.resolve('docs/lab-orders-guide.pdf');
const BASE_DIR = path.dirname(MD_PATH);

const css = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif;
    color: #1f2937; line-height: 1.55; font-size: 11.5pt;
    margin: 0; padding: 0;
  }
  h1 { font-size: 22pt; color: #6d28d9; border-bottom: 3px solid #ede9fe; padding-bottom: 8px; margin: 0 0 18px; }
  h2 { font-size: 16pt; color: #5b21b6; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 28px 0 12px; page-break-after: avoid; }
  h3 { font-size: 13pt; color: #4c1d95; margin: 20px 0 8px; page-break-after: avoid; }
  h4 { font-size: 12pt; color: #374151; margin: 14px 0 6px; page-break-after: avoid; }
  p  { margin: 8px 0; }
  ul, ol { margin: 6px 0 10px; padding-left: 22px; }
  li { margin: 3px 0; }
  code {
    background: #f3f4f6; padding: 1px 5px; border-radius: 4px;
    font-family: "Consolas", "Courier New", monospace; font-size: 10pt;
    color: #be185d;
  }
  pre {
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 10px 12px; overflow-x: auto; font-size: 10pt;
  }
  pre code { background: transparent; padding: 0; color: inherit; }
  blockquote {
    margin: 10px 0; padding: 8px 14px; border-left: 4px solid #a78bfa;
    background: #f5f3ff; color: #4c1d95; border-radius: 0 6px 6px 0;
  }
  blockquote p { margin: 2px 0; }
  table {
    border-collapse: collapse; width: 100%; margin: 10px 0;
    font-size: 10.5pt; page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #e5e7eb; padding: 6px 9px; text-align: left;
    vertical-align: top;
  }
  th { background: #f5f3ff; color: #5b21b6; font-weight: 700; }
  tr:nth-child(even) td { background: #fafafa; }
  img {
    max-width: 100%; height: auto; display: block;
    margin: 12px auto; border: 1px solid #e5e7eb; border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    page-break-inside: avoid;
  }
  hr { border: none; border-top: 1px dashed #d1d5db; margin: 22px 0; }
  strong { color: #111827; }
  a { color: #6d28d9; text-decoration: none; }
`;

(async () => {
  const md = await readFile(MD_PATH, 'utf8');
  const htmlBody = marked.parse(md);

  const html = `<!doctype html>
<html lang="mn">
<head>
  <meta charset="utf-8" />
  <title>Лаб бүртгэлийн заавар</title>
  <style>${css}</style>
</head>
<body>
  <article>${htmlBody}</article>
</body>
</html>`;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Use file:// base so relative image paths resolve from BASE_DIR
  const fileUrl = 'file:///' + path.join(BASE_DIR, '__guide.html').replace(/\\/g, '/');
  await writeFile(path.join(BASE_DIR, '__guide.html'), html, 'utf8');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
  });

  await browser.close();

  // cleanup temp html
  try { await (await import('node:fs/promises')).unlink(path.join(BASE_DIR, '__guide.html')); } catch {}

  console.log(`✅ PDF үүсгэгдлээ: ${PDF_PATH}`);
})().catch(err => { console.error(err); process.exit(1); });
