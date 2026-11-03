const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined,
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      (process.env.APP_URL || "http://127.0.0.1:5173/") + "#two-sum",
    );
    await page
      .getByRole("button", { name: "Load solution", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Run & visualize", exact: true })
      .click();
    await page.locator(".lab-result.passed").waitFor({ timeout: 90000 });
    const slider = page.getByLabel("Execution step");
    await page.waitForFunction(
      () =>
        Number(document.querySelector('[aria-label="Execution step"]').value) >
        0,
    );
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    const paused = await slider.inputValue();
    await page.waitForTimeout(1000);
    assert.equal(await slider.inputValue(), paused);
    await page
      .getByRole("button", { name: "Restart playback", exact: true })
      .click();
    assert.equal(await slider.inputValue(), "0");
    await page.getByLabel("Playback speed").selectOption("2");
    await page.getByRole("button", { name: "Next frame", exact: true }).click();
    assert.equal(await slider.inputValue(), "1");
    await page
      .getByRole("button", { name: "Previous frame", exact: true })
      .click();
    assert.equal(await slider.inputValue(), "0");
    await slider.fill(await slider.getAttribute("max"));
    await page.waitForTimeout(500);
    const shot = async (n) => {
      if (process.env.SCREENSHOT_DIR)
        await page.screenshot({
          path: path.join(process.env.SCREENSHOT_DIR, n + ".png"),
          fullPage: true,
        });
    };
    await shot("algoplay-visual-stage");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("algoplay-visual-mobile");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await shot("algoplay-visual-light");
    await page.getByLabel("Programming language").selectOption("javascript");
    await page
      .locator(".cm-content")
      .fill(
        "function twoSum(nums,target){\n const custom = [4,3,2,1];\n let cursor = 2;\n return [];\n}",
      );
    await page
      .getByRole("button", { name: "Run & visualize", exact: true })
      .click();
    await page.locator(".lab-result.failed").waitFor();
    await slider.fill(await slider.getAttribute("max"));
    await page.locator(".lab-details summary").click();
    await page.getByLabel("Visualized sequence").selectOption("custom");
    await page.getByLabel("Extra index pointer").selectOption("cursor");
    assert.deepEqual(await page.locator(".lab-value").allTextContents(), [
      "4",
      "3",
      "2",
      "1",
    ]);
    assert.match(
      await page.locator(".lab-svg-pointer").textContent(),
      /cursor = 2/,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Autoplay, pause, restart, step, speed, custom bindings and responsive scene scaling passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
