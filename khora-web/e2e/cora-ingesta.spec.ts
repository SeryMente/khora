// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
import { test, expect } from "@playwright/test";

test.describe("Ingesta UI", () => {
  test.beforeEach(async ({ page }) => {
    // Override default timeout if needed
    // Ensure we do not get blocked by Next-Auth
    // Provide a mocked session directly in the browser via cookie or bypass
    // the UI requirement by intercepting the page loading and setting our own.

    // However, since middleware protects /sistema/ingesta directly in next.js,
    // we bypass it using Playwright's auth state or just mocking the session.
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { email: "test@example.com", name: "Test User" },
          expires: new Date(Date.now() + 86400 * 1000).toISOString(),
        }),
      });
    });

    // Navigate to the test page directly
    await page.goto("/sistema/ingesta");
  });

  test("should have mutually exclusive inputs", async ({ page }) => {
    const textInput = page.locator("textarea");
    const fileInput = page.locator('input[type="file"]');

    // Type text
    await textInput.fill("Some test content");
    await expect(fileInput).toBeDisabled();

    // Clear text
    await textInput.fill("");
    await expect(fileInput).not.toBeDisabled();
  });

  test("should reject file exceeding 10MB", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Create a dummy file > 10MB
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, "a");

    await fileInput.setInputFiles({
      name: "large.txt",
      mimeType: "text/plain",
      buffer: largeBuffer,
    });

    await expect(page.locator("text=File exceeds 10MB limit.")).toBeVisible();
  });

  test("should reject invalid mime types", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: "test.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("dummy content"),
    });

    await expect(page.locator("text=Invalid file type.")).toBeVisible();
  });

  test("should submit text successfully and show result exactly", async ({ page }) => {
    const textInput = page.locator("textarea");
    const submitBtn = page.locator('button[type="submit"]');

    await page.route("/api/ingesta", async (route) => {
      const request = route.request();
      const postData = await request.postData();
      expect(postData).toContain("name=\"text\"");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          io_id: "test-io-123",
          counters: { create: 1, update: 0, ignore: 0 },
          ts: "2026-07-24T20:30:00Z",
          skip_status: "[SKIP]"
        }),
      });
    });

    await textInput.fill("Test text for ingesta");
    await submitBtn.click();

    // Wait for result to appear
    const resultBox = page.locator("pre");
    await expect(resultBox).toBeVisible();
    await expect(resultBox).toContainText("test-io-123");
    await expect(resultBox).toContainText("[SKIP]");
  });

  test("should submit file successfully and show result exactly", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const submitBtn = page.locator('button[type="submit"]');

    await page.route("/api/ingesta", async (route) => {
      const request = route.request();
      const postData = await request.postData();
      expect(postData).toContain("filename=\"test.png\"");
      expect(postData).toContain("image/png");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          io_id: "file-io-456",
          counters: { create: 0, update: 1, ignore: 0 },
          ts: "2026-07-24T20:31:00Z",
        }),
      });
    });

    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake image content"),
    });

    await submitBtn.click();

    // Wait for result to appear
    const resultBox = page.locator("pre");
    await expect(resultBox).toBeVisible();
    await expect(resultBox).toContainText("file-io-456");
  });
});
