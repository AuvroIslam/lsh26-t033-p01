import { chromium } from 'playwright';

const URL = process.env.SHOT_URL ?? 'https://lsh26-t033-p01.vercel.app';
const OUT = 'Slide/assets';

const browser = await chromium.launch();

// Desktop: sample data loaded so the timeline is full.
const desktop = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await desktop.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Load published sample data/i }).click();
await page.waitForTimeout(1200);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/shot-desktop.png` });
await page.screenshot({ path: `${OUT}/shot-full.png`, fullPage: true });

// Just the timeline card, for a tight hero crop.
const timeline = page.locator('section').first();
await timeline.screenshot({ path: `${OUT}/shot-timeline.png` });

// The plan panel with its badges.
const planCard = page.locator('section', { hasText: 'The plan' }).last();
await planCard.screenshot({ path: `${OUT}/shot-plan.png` });
await desktop.close();

// Phone: the empty state with the mascot, then a populated one.
const phone = await browser.newContext({
  viewport: { width: 420, height: 900 },
  deviceScaleFactor: 3,
});
const mobile = await phone.newPage();
await mobile.goto(URL, { waitUntil: 'networkidle' });
await mobile.getByRole('button', { name: /Load published sample data/i }).click();
await mobile.waitForTimeout(1000);
// Show the generator headline and the plan, not the empty small hours.
await mobile.locator('text=Total generator minutes').scrollIntoViewIfNeeded();
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: `${OUT}/shot-phone.png` });
await phone.close();

await browser.close();
console.log('screenshots written to', OUT);
