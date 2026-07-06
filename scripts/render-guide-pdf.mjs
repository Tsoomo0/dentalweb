// HTML заавар → PDF болгон хувиргана (Playwright/chromium).
// Ашиглах: node scripts/render-guide-pdf.mjs <input.html> <output.pdf>
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const input = process.argv[2] || 'docs/daily-sheet-updates-guide.html';
const output = process.argv[3] || 'docs/Өдрийн-тооцоо-шинэчлэл-заавар.pdf';

const inUrl = pathToFileURL(path.resolve(input)).href;
const outPath = path.resolve(output);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(inUrl, { waitUntil: 'networkidle' });
await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
});
await browser.close();
console.log(`✓ PDF үүслээ: ${outPath}`);
