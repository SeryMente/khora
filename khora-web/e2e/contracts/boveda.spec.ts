// @l0 L0-002-R · @req BOVEDA-01/CONTRACT-TEST
import { test, expect } from "@playwright/test";

test.describe("Bóveda Page Reskin - BOVEDA-01", () => {
  test.beforeEach(async ({ page }) => {
    // Go directly to the bóveda page
    await page.goto("/sistema/boveda");
  });

  test("reskin canónico and correct variables are applied on the outer container", async ({ page }) => {
    // Locate the outer container precisely using class names
    const outerContainer = page.locator("div.font-mono.p-4").first();
    await expect(outerContainer).toBeVisible();

    // Verify outer container style has var(--khora-bg)
    const styleAttr = await outerContainer.getAttribute("style");
    expect(styleAttr).toContain("var(--khora-bg)");
    expect(styleAttr).toContain("var(--khora-ink)");
    expect(styleAttr).toContain("6rem");

    // Verify paddingBottom in computed styles resolves correctly
    const paddingBottom = await outerContainer.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom;
    });
    // 6rem of 16px is 96px
    expect(paddingBottom).toBe("96px");
  });

  test("reskin canónico and correct variables on the inner card and status indicators", async ({ page }) => {
    // Find the main card container (max-w-md div)
    const card = page.locator(".max-w-md");
    await expect(card).toBeVisible();

    const cardStyle = await card.getAttribute("style");
    expect(cardStyle).toContain("var(--khora-surface)");
    expect(cardStyle).toContain("var(--khora-border)");

    // Find input field and check its styling variables
    const pinInput = page.locator("input[type='password']");
    await expect(pinInput).toBeVisible();

    const inputStyle = await pinInput.getAttribute("style");
    expect(inputStyle).toContain("var(--khora-bg)");
    expect(inputStyle).toContain("var(--khora-ink)");
    expect(inputStyle).toContain("var(--khora-border)");

    // Find submit button and check its styling variables
    const actionBtn = page.locator("button");
    await expect(actionBtn).toBeVisible();

    const btnStyle = await actionBtn.getAttribute("style");
    expect(btnStyle).toContain("var(--khora-accent)");
    expect(btnStyle).toContain("var(--khora-bg)");
  });

  test("iconography is lucide-react with size 32 and strokeWidth 1.75", async ({ page }) => {
    // Wait for the SVG elements specifically inside our vault card container
    const svgElements = page.locator(".max-w-md svg");
    const count = await svgElements.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const svg = svgElements.nth(i);
      const width = await svg.getAttribute("width");
      const height = await svg.getAttribute("height");
      const strokeWidth = await svg.getAttribute("stroke-width");

      expect(width).toBe("32");
      expect(height).toBe("32");
      expect(strokeWidth).toBe("1.75");
    }
  });

  test("no literal colors and no cora-* classes exist in any elements", async ({ page }) => {
    // Check all elements inside the max-w-md card
    const allElements = page.locator(".max-w-md *");
    const count = await allElements.count();

    for (let i = 0; i < count; i++) {
      const el = allElements.nth(i);

      // Check classes for any cora-* prefix
      const classAttr = await el.getAttribute("class");
      if (classAttr) {
        expect(classAttr).not.toContain("cora-");
      }

      // Check inline style for any literal hex, rgb or rgba colors
      const styleAttr = await el.getAttribute("style");
      if (styleAttr) {
        // Regex to find literal hex colors: e.g. #fff, #FFFFFF
        expect(styleAttr).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
        // Regex to find rgb/rgba colors: e.g. rgb(255, 255, 255), rgba(...)
        expect(styleAttr).not.toMatch(/\brgb\(/);
        expect(styleAttr).not.toMatch(/\brgba\(/);
        // Ensure standard named colors are not used literally in styles
        expect(styleAttr).not.toMatch(/\bcolor:\s*(red|blue|green|black|white|yellow)\b/);
      }
    }
  });
});
