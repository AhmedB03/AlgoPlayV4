import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Start the app separately with npm run dev. A controllable worker holds the
// submission open so this exercises cancellation rather than algorithm speed.
const baseURL = process.env.APP_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
try {
  for (const navigation of ['clear hash', 'invalid hash', 'browser back']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.testWorkers = [];
      window.Worker = class {
        constructor() { this.terminated = false; window.testWorkers.push(this); }
        postMessage() {}
        terminate() { this.terminated = true; }
      };
    });
    await page.goto(baseURL);
    await page.evaluate(() => { location.hash = 'two-sum'; });
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    assert.equal(await page.evaluate(() => window.testWorkers.length), 1);
    if (navigation === 'browser back') await page.goBack();
    else await page.evaluate(hash => { location.hash = hash; }, navigation === 'clear hash' ? '' : 'unknown-problem');
    await page.getByRole('button', { name: 'Playground', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.testWorkers[0].terminated), true, `${navigation}: worker must stop`);
    // Wait beyond the actual runner timeout to catch phantom TLE submissions.
    await page.waitForTimeout(3200);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('algoplay-submissions'))), {}, `${navigation}: cancelled submission must not be saved`);
    if (navigation === 'browser back') await page.goForward();
    else await page.evaluate(() => { location.hash = 'two-sum'; });
    const submit = page.getByRole('button', { name: 'Submit', exact: true });
    await submit.waitFor();
    assert.equal(await submit.isEnabled(), true, `${navigation}: workspace must be runnable`);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS: ${navigation} cancels execution without saving a result`);
  }
} finally {
  await browser.close();
}
