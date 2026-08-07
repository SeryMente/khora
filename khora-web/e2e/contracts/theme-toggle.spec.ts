// @l0 L0-002-R · @req UI-03/THEME-TOGGLE
import { test, expect } from "@playwright/test";

test.describe("ThemeToggle Component Contract & E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Set up credentials/auth to bypass if needed, to load home page cleanly
    await page.addInitScript(() => {
      localStorage.setItem(
        "khora_auth_session",
        JSON.stringify({ authenticated: true, timestamp: Date.now() })
      );
    });
  });

  test("should load with default dark theme, toggle to light, and persist after reload", async ({
    page,
  }) => {
    // 1. Go to root home page which displays SystemBar and its options
    await page.goto("/");
    await expect(page).toHaveURL(/.*localhost:3000.*/);

    // 2. Default theme should be dark (dataset.theme on <html> element)
    const htmlElement = page.locator("html");
    await expect(htmlElement).toHaveAttribute("data-theme", "dark");

    // 3. Find the Theme Toggle button in the SystemBar
    // It has title "Cambiar a claro" or text "Tema" and is a div role="button" now
    const toggleButton = page.locator('div[role="button"]:has-text("Tema")');
    await expect(toggleButton).toBeVisible();

    // The icon inside when dark should be Sun
    const sunIcon = toggleButton.locator("svg");
    await expect(sunIcon).toBeVisible();

    // 4. Click to toggle theme to light
    await toggleButton.click();

    // 5. Verify the theme attribute on html element changed to light
    await expect(htmlElement).toHaveAttribute("data-theme", "light");

    // 6. Verify that localStorage has "khora-theme" set to "light"
    const storedTheme = await page.evaluate(() => localStorage.getItem("khora-theme"));
    expect(storedTheme).toBe("light");

    // 7. Reload page and confirm it remains light
    await page.reload();
    await expect(htmlElement).toHaveAttribute("data-theme", "light");

    // 8. Click again to toggle back to dark
    await toggleButton.click();
    await expect(htmlElement).toHaveAttribute("data-theme", "dark");
    const storedThemeDark = await page.evaluate(() => localStorage.getItem("khora-theme"));
    expect(storedThemeDark).toBe("dark");
  });
});
