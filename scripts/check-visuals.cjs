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
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.APP_URL || "http://127.0.0.1:5173/";
    const shot = async (name) => {
      if (process.env.SCREENSHOT_DIR)
        await page.screenshot({
          path: path.join(process.env.SCREENSHOT_DIR, name + ".png"),
          fullPage: true,
        });
    };
    await page.goto(base + "#two-sum");
    await page.getByLabel("Programming language").waitFor();
    assert.equal(
      await page.getByLabel("Programming language").inputValue(),
      "python",
    );
    assert.match(
      await page.locator(".lab-stage-caption").innerText(),
      /Input preview/,
    );
    assert.equal(await page.locator(".lab-value").count(), 4);
    const slider = page.getByLabel("Execution step");
    async function run() {
      await page
        .getByRole("button", { name: "Run & visualize", exact: true })
        .click();
      await page.locator(".lab-result").waitFor({ timeout: 90000 });
    }
    async function frame(n) {
      await slider.fill(String(n));
    }
    for (const language of ["python", "javascript"]) {
      await page.getByLabel("Programming language").selectOption(language);
      for (const id of [
        "two-sum",
        "binary-search",
        "reverse-list",
        "parentheses",
        "graph-bfs",
        "palindrome",
      ]) {
        await page.evaluate((id) => (location.hash = id), id);
        await page
          .getByRole("button", { name: "Load solution", exact: true })
          .click();
        await run();
        assert(
          await page.locator(".lab-result.passed").count(),
          `${language} ${id} failed`,
        );
        const max = Number(await slider.getAttribute("max"));
        assert(max > 1);
        await frame(max);
        const final = await page.locator(".lab-stage").innerHTML();
        await frame(1);
        assert.notEqual(
          await page.locator(".lab-stage").innerHTML(),
          final,
          `${id} did not change`,
        );
        if (id === "reverse-list") {
          await frame(max);
          assert.equal(await page.locator(".lab-list-node").count(), 5);
          const paths = await page
            .locator(".lab-link")
            .evaluateAll((es) => es.map((e) => e.getAttribute("d")));
          assert(
            paths.some((d) => d.includes(" 72 ")),
            "No reversed links drawn",
          );
        }
        if (id === "parentheses") {
          let peak = 0;
          for (let n = 1; n <= max; n++) {
            await frame(n);
            peak = Math.max(peak, await page.locator(".lab-stack>div").count());
            if (peak === 3) {
              if (language === "python") await shot("algoplay-stack");
              break;
            }
          }
          assert.equal(peak, 3, "Stack did not grow");
          await frame(max);
          assert.equal(
            await page.locator(".lab-stack>div").count(),
            0,
            "Stack did not empty",
          );
        }
        if (id === "graph-bfs") {
          await frame(max);
          assert.equal(await page.locator(".lab-queue>div").count(), 6);
          assert.equal(await page.locator(".lab-edge").count(), 5);
        }
        if (id === "palindrome") {
          await frame(max);
          assert.equal(
            await page.locator(".lab-value").count(),
            21,
            "Cleaned string must retain both ends",
          );
        }
        await frame(Math.max(1, max - 2));
        if (
          language === "python" &&
          ["reverse-list", "graph-bfs", "binary-search"].includes(id)
        )
          await shot("algoplay-" + id);
        console.log(`${language}: ${id}, ${max + 1} frames verified`);
      }
      await page.evaluate(() => (location.hash = "two-sum"));
      await page
        .locator(".cm-content")
        .fill(
          language === "python"
            ? "def twoSum(nums, target):\n    nums[0] = 99\n    i = 3\n    marker = 130\n    return []"
            : "function twoSum(nums, target) {\n nums[0] = 99;\n let i = 3;\n let marker = 230;\n return [];\n}",
        );
      await run();
      await frame(Number(await slider.getAttribute("max")));
      assert(await page.locator(".lab-result.failed").count());
      assert.match(await page.locator(".lab-canvas").textContent(), /99/);
      assert.match(
        await page.locator(".lab-svg-pointer").textContent(),
        /i = 3/,
      );
      assert.match(
        await page.locator(".trace-variables").innerText(),
        language === "python" ? /130/ : /230/,
      );
      await page
        .locator(".cm-content")
        .fill(
          language === "python"
            ? "def twoSum(nums, target):\n    return [0, 1]"
            : "function twoSum(nums, target) {return [0,1];}",
        );
      assert(
        await page
          .getByRole("button", { name: "Play recording", exact: true })
          .isDisabled(),
      );
    }
    await page.getByLabel("Programming language").selectOption("python");
    await page
      .getByRole("button", { name: "Load solution", exact: true })
      .click();
    await run();
    await frame(Number(await slider.getAttribute("max")));
    await shot("algoplay-visual-stage");
    await page
      .getByRole("button", { name: "Expand visualizer", exact: true })
      .click();
    assert(await page.locator(".right-col").isHidden());
    await page
      .getByRole("button", { name: "Exit expanded visualizer", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await shot("algoplay-visual-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: /Switch to light/ }).click();
    await shot("algoplay-visual-light");
    assert.deepEqual(errors, []);
    console.log(
      "Custom wrong-code visuals, stale recording, focus, mobile and reduced motion passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
