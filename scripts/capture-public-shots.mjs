// Нийтийн сайтын хуудсуудын screenshot авна (redesign-ийг танилцуулгад оруулах).
// Ашиглах: node scripts/capture-public-shots.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const BASE = process.env.APP_URL || 'http://127.0.0.1:8000';
const OUT = path.resolve('docs/shots');
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  { slug: 'welcome', url: '/' },
  { slug: 'services', url: '/services' },
  { slug: 'doctors', url: '/doctors' },
  { slug: 'booking', url: '/booking' },
  { slug: 'about', url: '/about' },
  { slug: 'contact', url: '/contact' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

for (const p of pages) {
  try {
    await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200); // анимэйшн дуустал
    const file = path.join(OUT, `${p.slug}.png`);
    // Дээд хэсгийг (hero) л авна — танилцуулгад ороход тохиромжтой
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    console.log(`✓ ${p.slug}.png`);
  } catch (e) {
    console.log(`✗ ${p.slug}: ${e.message}`);
  }
}

await browser.close();
console.log('Дууслаа →', OUT);
