import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("deliverables", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.evaluate(() => document.fonts.ready);
await page
  .locator("img")
  .evaluateAll((imgs) => imgs.forEach((img) => (img.loading = "eager")));
await page.waitForFunction(() =>
  Array.from(document.images).every(
    (img) => img.complete && img.naturalWidth > 0,
  ),
);
await page.screenshot({
  path: "deliverables/desktop-preview.png",
  fullPage: true,
});
assert.equal(
  await page
    .locator("img")
    .evaluateAll(
      (imgs) => imgs.filter((i) => i.complete && !i.naturalWidth).length,
    ),
  0,
);
await page
  .getByRole("button", {
    name: "Add Mayura / sculptural study to cart",
    exact: true,
  })
  .click();
for (let i = 0; i < 5; i++)
  await page
    .getByRole("button", {
      name: "Add one Mayura / sculptural study",
      exact: true,
    })
    .click();
assert(
  await page
    .getByRole("button", {
      name: "Add one Mayura / sculptural study",
      exact: true,
    })
    .isDisabled(),
);
assert(
  await page
    .getByRole("button", {
      name: "Add Svara / a quiet composition to cart",
      exact: true,
    })
    .isDisabled(),
);
for (let i = 0; i < 4; i++)
  await page
    .getByRole("button", {
      name: "Remove one Mayura / sculptural study",
      exact: true,
    })
    .click();
await page.getByRole("button", { name: "Open cart", exact: true }).click();
await page.getByLabel("Your name", { exact: true }).fill("Demo Customer");
await page.getByLabel("Phone number", { exact: true }).fill("9999999999");
await page
  .getByLabel("City / PIN code", { exact: true })
  .fill("Bengaluru 560027");
await page
  .getByRole("button", { name: "Create WhatsApp request", exact: true })
  .click();
await page
  .getByRole("button", { name: "View request in store management" })
  .click();
assert.equal(await page.getByTestId("stock-total").innerText(), "13");
await page.getByRole("button", { name: "Confirm sale", exact: true }).click();
assert.equal(await page.getByTestId("stock-total").innerText(), "11");
await page
  .getByRole("button", { name: "Return & restock", exact: true })
  .click();
assert.equal(await page.getByTestId("stock-total").innerText(), "13");
await page.getByRole("button", { name: "Inventory", exact: true }).click();
await page
  .getByRole("button", {
    name: "Adjust Svara / a quiet composition",
    exact: true,
  })
  .click();
await page.getByLabel("Quantity change", { exact: true }).fill("5");
await page
  .getByLabel("Adjustment reason", { exact: true })
  .fill("Launch stock count");
await page.getByRole("button", { name: "Save stock movement" }).click();
assert.equal(await page.getByTestId("stock-total").innerText(), "18");
await page.getByRole("button", { name: "Tally sync", exact: true }).click();
await page.getByRole("button", { name: "Run demo sync", exact: true }).click();
await page.waitForTimeout(1400);
assert.equal(
  await page.locator(".stats>div").last().locator("b").innerText(),
  "0",
);
await page
  .getByRole("button", { name: "Back to storefront", exact: false })
  .click();
await page.reload();
assert.equal(
  await page
    .locator(".object-card")
    .filter({ hasText: "Svara / a quiet composition" })
    .locator(".object-info small")
    .innerText(),
  "5 available",
);
await page
  .getByRole("button", { name: "Save Surya / the brass circle", exact: true })
  .click();
await page.getByRole("button", { name: "Saved objects", exact: true }).click();
assert.equal(await page.locator(".object-card").count(), 1);
await page.getByRole("button", { name: "Saved objects", exact: true }).click();
await page.getByRole("button", { name: "Mirrors", exact: true }).click();
assert.equal(await page.locator(".object-card").count(), 5);
await page.getByRole("button", { name: "All objects", exact: true }).click();
assert.equal(await page.locator(".object-card.coming-soon").count(), 11);
assert.equal(
  await page.locator(".object-card.coming-soon .add-circle").count(),
  0,
);
await page.getByLabel("Filter by availability").selectOption("Coming soon");
assert.equal(await page.locator(".object-card").count(), 11);
await page
  .getByLabel("Filter by availability")
  .selectOption("All availability");
await page.getByLabel("Filter by price").selectOption("Under ₹10,000");
assert.equal(await page.locator(".object-card").count(), 1);
await page.getByLabel("Filter by price").selectOption("Any price");
await page
  .getByRole("button", { name: "View Mayura / sculptural study", exact: true })
  .click();
assert.match(page.url(), /\/products\/mayura-sculptural-study$/);
await page.getByRole("button", { name: "Close details", exact: true }).click();
await page.getByLabel("Planner object", { exact: true }).selectOption("2");
await page
  .getByRole("button", { name: "Wall colour #c49175", exact: true })
  .click();
await page.waitForTimeout(600);
assert.equal(
  await page
    .locator(".wall-preview")
    .evaluate((el) => getComputedStyle(el).backgroundColor),
  "rgb(196, 145, 117)",
);
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({
  path: "deliverables/mobile-preview.png",
  fullPage: true,
});
assert(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
assert.deepEqual(errors, []);
console.log(
  "PASS: stock limits, empty-stock protection, quantity removal, pending/confirmed/returned orders, stock adjustment, sync queue, persistence, saved items, filters, planner, mobile overflow, image loading and runtime errors.",
);
await browser.close();
