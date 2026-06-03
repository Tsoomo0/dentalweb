// Captures screenshots for the Lab Orders guide.
// Usage: node scripts/screenshot-lab-guide.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.APP_URL || 'http://127.0.0.1:8000';
const RECEPTION = { email: process.env.RECEPTION_EMAIL, password: process.env.RECEPTION_PASSWORD };
const LAB       = { email: process.env.LAB_EMAIL,       password: process.env.LAB_PASSWORD };
const OUT_DIR   = path.resolve('docs/images');

async function login(page, { email, password }) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    // Inertia XHR submit — wait until URL leaves /login
    await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');
}

async function logout(page) {
    // Best-effort logout via POST to /logout
    await page.goto(`${BASE}/login`); // ensures CSRF page
    await page.evaluate(async (base) => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        await fetch(`${base}/logout`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': token || '', 'Accept': 'application/json' },
            credentials: 'include',
        }).catch(() => {});
    }, BASE);
    await page.context().clearCookies();
}

async function shot(page, name) {
    const file = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`✓ ${name}.png`);
}

async function waitTable(page) {
    // Page already navigated; wait for any FlaskConical icon to be on screen
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800); // small breath for animations
}

(async () => {
    await mkdir(OUT_DIR, { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 },
        deviceScaleFactor: 2,
        locale: 'mn-MN',
    });
    const page = await context.newPage();

    /* ── RECEPTION ── */
    console.log('→ Reception login...');
    await login(page, RECEPTION);

    console.log('→ Reception /lab-orders index...');
    await page.goto(`${BASE}/reception/lab-orders`, { waitUntil: 'networkidle' });
    await waitTable(page);
    await shot(page, '01-reception-index');

    // Switch to "Бүгд" so we have records to demonstrate
    console.log('→ Reception "Бүгд" filter...');
    const allBtn = page.locator('button:has-text("Бүгд")').first();
    if (await allBtn.count() > 0) {
        await allBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        await shot(page, '04-reception-filter-all');
    }

    // Open existing order drawer (first row) if any
    console.log('→ Reception edit drawer...');
    const firstRow = page.locator('table tbody tr.cursor-pointer').first();
    if (await firstRow.count() > 0) {
        await firstRow.click();
        await page.waitForTimeout(1000);
        await shot(page, '03-reception-edit-drawer');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    } else {
        console.log('  (no rows to open)');
    }

    // Open "Шинэ бүртгэл" drawer
    console.log('→ Reception new-order drawer...');
    const newBtn = page.locator('button:has-text("Шинэ бүртгэл")').first();
    if (await newBtn.count() > 0) {
        await newBtn.click();
        await page.waitForTimeout(1000);
        await shot(page, '02-reception-new-drawer');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    } else {
        console.log('  (new button not found)');
    }

    /* ── LAB ── */
    console.log('→ Logout reception...');
    await logout(page);

    console.log('→ Lab login...');
    await login(page, LAB);

    console.log('→ Lab /lab-orders index...');
    await page.goto(`${BASE}/lab/lab-orders`, { waitUntil: 'networkidle' });
    await waitTable(page);
    await shot(page, '05-lab-index');

    // Try "Бүгд" filter for lab too in case no active orders
    const labAll = page.locator('button:has-text("Бүгд")').first();
    if (await labAll.count() > 0) {
        await labAll.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
    }

    // Open first lab order drawer
    console.log('→ Lab work drawer...');
    const labFirstRow = page.locator('table tbody tr.cursor-pointer').first();
    if (await labFirstRow.count() > 0) {
        await labFirstRow.click();
        await page.waitForTimeout(1000);
        await shot(page, '06-lab-work-drawer');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    } else {
        console.log('  (no lab rows to open)');
    }

    // Lab dashboard
    console.log('→ Lab dashboard...');
    try {
        await page.goto(`${BASE}/lab/dashboard`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        await shot(page, '07-lab-dashboard');
    } catch (e) { console.warn('  (skipped lab dashboard)', e.message); }

    await browser.close();
    console.log('\n✅ Done. See docs/images/');
})().catch(err => {
    console.error(err);
    process.exit(1);
});
