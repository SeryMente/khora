import { test, expect, type Page } from "@playwright/test";

const splash = '[data-testid="khora-splash"]';
const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1180, height: 820 },
];

async function observeBoot(page: Page, theme = "dark", freeze = false) {
    await page.addInitScript(({ theme, freeze }) => {
        localStorage.setItem("khora-theme", theme);
        const state = { started: 0, ended: 0, font: "", frozen: false, callbacks: 0 };
        Object.assign(window, { __splashEvidence: state });
        const observer = new MutationObserver(() => {
            const overlay = document.querySelector<HTMLElement>('[data-testid="khora-splash"]');
            if (overlay && ["running", "reduced"].includes(overlay.dataset.phase || "") && !state.started) {
                state.started = performance.now();
                state.font = overlay.dataset.fontStatus || "";
                if (freeze && overlay.dataset.phase === "running") {
                    for (const animation of overlay.getAnimations({ subtree: true })) {
                        animation.pause();
                        animation.currentTime = 400;
                    }
                    state.frozen = true;
                }
            }
            if (!state.ended && state.started && (!overlay || overlay.dataset.phase === "complete")) {
                state.ended = performance.now();
                state.callbacks++;
            }
        });
        observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-phase"] });
    }, { theme, freeze });
}

async function evidence(page: Page) {
    return page.evaluate(() => (window as unknown as { __splashEvidence: { started: number; ended: number; font: string; frozen: boolean; callbacks: number } }).__splashEvidence);
}

for (const theme of ["dark", "light"]) {
    for (const viewport of viewports) {
        test(`identity ${theme} ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await observeBoot(page, theme, true);
            await page.goto("/sistema/volcados", { waitUntil: "domcontentloaded" });
            await expect.poll(async () => (await evidence(page)).frozen).toBe(true);
            const overlay = page.locator(splash);
            const word = overlay.locator("span");
            await expect(word).toHaveText("Khora");
            await expect(overlay.locator("svg, img, button, progress")).toHaveCount(0);
            const style = await word.evaluate((node) => {
                const s = getComputedStyle(node);
                const r = node.getBoundingClientRect();
                return { textTransform: s.textTransform, weight: s.fontWeight, size: parseFloat(s.fontSize), spacing: parseFloat(s.letterSpacing), color: s.color, family: s.fontFamily, x: r.x, y: r.y, width: r.width, height: r.height };
            });
            expect(style.textTransform).toBe("none");
            expect(style.weight).toBe("600");
            expect(style.size).toBeCloseTo(Math.max(36, Math.min(viewport.width * 0.05, 56)), 1);
            expect(style.spacing).toBeCloseTo(-0.015 * style.size, 2);
            expect(style.family).toContain("Geist");
            expect(style.color).toBe(theme === "dark" ? "rgb(255, 255, 255)" : "rgb(28, 29, 31)");
            expect(Math.abs(style.x + style.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
            expect(Math.abs(style.y + style.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1);
            expect(style.width).toBeLessThanOrEqual(viewport.width * 0.34);
            await expect(overlay).toHaveCSS("background-color", theme === "dark" ? "rgb(0, 0, 0)" : "rgb(244, 242, 239)");
            await expect(page.locator("body")).toHaveCSS("background-color", theme === "dark" ? "rgb(0, 0, 0)" : "rgb(244, 242, 239)");
            await expect(page.locator('[data-testid="khora-shell"]')).toHaveCount(1);
            for (const ms of [0, 130, 260, 500, 899, 900, 1050, 1199]) {
                await overlay.evaluate((node, ms) => {
                    for (const animation of node.getAnimations({ subtree: true })) animation.currentTime = ms;
                }, ms);
                if (ms <= 900) await expect(overlay).toHaveCSS("opacity", "1");
                if (ms === 0) await expect(word).toHaveCSS("opacity", "0");
                if (ms >= 260) await expect(word).toHaveCSS("opacity", "1");
                if (ms === 1050) {
                    const opacity = await overlay.evaluate(node => Number(getComputedStyle(node).opacity));
                    expect(opacity).toBeGreaterThan(0);
                    expect(opacity).toBeLessThan(1);
                }
                await testInfo.attach(`splash-${theme}-${viewport.width}-${ms}ms`, { body: await page.screenshot(), contentType: "image/png" });
            }
            await overlay.evaluate(node => {
                for (const animation of node.getAnimations({ subtree: true })) animation.finish();
            });
            await expect(overlay).toHaveCount(0);
            await expect(page.locator("body")).toHaveCSS("background-color", theme === "dark" ? "rgb(10, 10, 11)" : "rgb(244, 242, 239)");
        });
    }
}

test("real timeline lasts 1200ms, then never replays on resume or client navigation", async ({ page }) => {
    await observeBoot(page);
    await page.goto("/sistema/volcados", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveCount(0);
    const result = await evidence(page);
    expect(result.started).toBeGreaterThan(0);
    expect(result.ended - result.started).toBeGreaterThanOrEqual(1170);
    expect(result.ended - result.started).toBeLessThanOrEqual(1230);
    expect(result.font).toBe("ready");
    expect(result.callbacks).toBe(1);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.getByRole("link", { name: "Ingreso", exact: true }).click();
    await expect(page).toHaveURL(/\/sistema\/ingreso/);
    await expect(page.locator(splash)).toHaveCount(0);
    expect((await evidence(page)).started).toBe(result.started);
});

for (const key of ["Escape", "Enter", "Space"]) {
    test(`skip ${key} consumes input and finishes without another fade`, async ({ page }) => {
        await observeBoot(page, "dark", true);
        await page.goto("/sistema/volcados", { waitUntil: "domcontentloaded" });
        await expect.poll(async () => (await evidence(page)).frozen).toBe(true);
        const elapsed = await page.evaluate(async (key) => {
            const began = performance.now();
            document.dispatchEvent(new KeyboardEvent("keydown", { key: key === "Space" ? " " : key, bubbles: true, cancelable: true }));
            return { ms: performance.now() - began, hidden: document.querySelector<HTMLElement>('[data-testid="khora-splash"]')?.style.display === "none" };
        }, key);
        expect(elapsed.ms).toBeLessThanOrEqual(100);
        expect(elapsed.hidden).toBe(true);
        await expect(page.locator(splash)).toHaveCount(0);
    });
}

test("touch skips without activating the underlying surface", async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: viewports[0] });
    const page = await context.newPage();
    try {
        await observeBoot(page, "light", true);
        await page.goto("http://localhost:3000/sistema/volcados", { waitUntil: "domcontentloaded" });
        await expect.poll(async () => (await evidence(page)).frozen).toBe(true);
        await page.touchscreen.tap(195, 422);
        await expect(page.locator(splash)).toHaveCount(0);
        await expect(page).toHaveURL(/\/sistema\/volcados$/);
    } finally { await context.close(); }
});

test("reduced motion retains identity for 500ms without animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await observeBoot(page);
    await page.goto("/sistema/volcados", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveAttribute("data-phase", "reduced");
    await expect(page.locator(`${splash} span`)).toHaveCSS("opacity", "1");
    expect(await page.locator(splash).evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.locator(splash)).toHaveCount(0);
    const result = await evidence(page);
    expect(result.ended - result.started).toBeGreaterThanOrEqual(470);
    expect(result.ended - result.started).toBeLessThanOrEqual(530);
});

test("first server-rendered surface is opaque even before JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
        await page.goto("http://localhost:3000/sistema/volcados");
        await expect(page.locator(splash)).toHaveCSS("opacity", "1");
        await expect(page.locator(splash)).toHaveCSS("background-color", "rgb(0, 0, 0)");
        await expect(page.locator(`${splash} span`)).toHaveCSS("opacity", "0");
        await expect(page.locator('[data-testid="khora-shell"]')).toHaveCount(1);
    } finally { await context.close(); }
});

test("late local font cannot start a partial or independent exit clock", async ({ page }) => {
    await page.route(/\.woff2(?:\?|$)/, async route => {
        await new Promise(resolve => setTimeout(resolve, 250));
        await route.continue();
    });
    await observeBoot(page);
    await page.goto("/sistema/volcados", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveCount(0);
    const result = await evidence(page);
    expect(result.font).toBe("ready");
    expect(result.ended - result.started).toBeGreaterThanOrEqual(1170);
    expect(result.ended - result.started).toBeLessThanOrEqual(1230);
});

// Infrastructure failure is fail-open to the shell, never a fake font identity.
test("unavailable font releases the shell instead of displaying a fallback", async ({ page }) => {
    await page.route(/\.woff2(?:\?|$)/, async route => {
        await new Promise(resolve => setTimeout(resolve, 1800));
        if (!page.isClosed()) await route.continue();
    });
    await observeBoot(page);
    await page.goto("/sistema/volcados", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveCount(0, { timeout: 1500 });
    expect((await evidence(page)).started).toBe(0);
    await expect(page.locator('[data-testid="khora-shell"]')).toHaveCount(1);
});
