import { test, expect, type Page } from "@playwright/test";

const splash = '[data-testid="khora-splash"]';
const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1180, height: 820 },
];

async function observeBoot(page: Page, theme = "dark", freeze = false, seed: number | null = 117) {
    await page.addInitScript(({ theme, freeze, seed }) => {
        localStorage.setItem("khora-theme", theme);
        const original = crypto.getRandomValues.bind(crypto) as <T extends ArrayBufferView | null>(values: T) => T;
        crypto.getRandomValues = function<T extends ArrayBufferView | null>(values: T): T {
            if (values instanceof Uint32Array && values.length === 1) {
                if (seed === null) throw new Error("test: entropy unavailable");
                values[0] = seed; return values;
            }
            return original(values);
        };
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
    }, { theme, freeze, seed });
}

async function evidence(page: Page) {
    return page.evaluate(() => (window as unknown as { __splashEvidence: { started: number; ended: number; font: string; frozen: boolean; callbacks: number } }).__splashEvidence);
}

for (const theme of ["dark", "light"]) {
    for (const viewport of viewports) {
        test(`identity ${theme} ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            await observeBoot(page, theme, true);
            await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
            await expect.poll(async () => (await evidence(page)).frozen).toBe(true);
            const overlay = page.locator(splash);
            const word = overlay.locator("span");
            const identity = overlay.locator(".khora-splash-identity");
            await expect(overlay.locator("svg rect")).toHaveCount(6);
            await expect(overlay.locator("svg path")).toHaveCount(1);
            const group = await identity.boundingBox();
            expect(group).not.toBeNull();
            expect(Math.abs(group!.y + group!.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1);
            await expect(word).toHaveText("Khora");
            await expect(overlay.locator("img, button, progress")).toHaveCount(0);
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
            const mark = overlay.locator("svg");
            await expect(mark).toHaveCSS("color", style.color);
            await expect(overlay.locator("svg path")).toHaveCSS("fill", theme === "dark" ? "rgb(0, 0, 0)" : "rgb(244, 242, 239)");
            const symbol = await mark.boundingBox();
            expect(style.y - (symbol!.y + symbol!.height)).toBeCloseTo(24, 1);
            expect(style.width).toBeLessThanOrEqual(viewport.width * 0.34);
            await expect(overlay).toHaveCSS("background-color", theme === "dark" ? "rgb(0, 0, 0)" : "rgb(244, 242, 239)");
            await expect(page.locator("body")).toHaveCSS("background-color", theme === "dark" ? "rgb(0, 0, 0)" : "rgb(244, 242, 239)");
            await expect(page.locator('[data-testid="khora-shell"]')).toHaveCount(1);
            await expect(identity).toHaveScreenshot(`intervalo-${theme}-${viewport.width}.png`, { animations: "allow", threshold: 2 / 255, maxDiffPixelRatio: 0.001 });
            const initialVariant = await overlay.locator("svg").getAttribute("data-variant");
            for (const ms of [0, 130, 260, 500, 899, 900, 1050, 1199]) {
                await overlay.evaluate((node, ms) => {
                    for (const animation of node.getAnimations({ subtree: true })) animation.currentTime = ms;
                }, ms);
                await expect(overlay.locator("svg")).toHaveAttribute("data-variant", initialVariant!);
                if (ms <= 900) await expect(overlay).toHaveCSS("opacity", "1");
                if (ms === 0) await expect(identity).toHaveCSS("opacity", "0");
                if (ms >= 260) await expect(identity).toHaveCSS("opacity", "1");
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
    await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveCount(0);
    const result = await evidence(page);
    expect(result.started).toBeGreaterThan(0);
    expect(result.ended - result.started).toBeGreaterThanOrEqual(1170);
    expect(result.ended - result.started).toBeLessThanOrEqual(1250);
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
        await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
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
        await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
        await expect.poll(async () => (await evidence(page)).frozen).toBe(true);
        await page.touchscreen.tap(195, 422);
        await expect(page.locator(splash)).toHaveCount(0);
        await expect(page).toHaveURL(/\/sistema\/custodia$/);
    } finally { await context.close(); }
});

test("reduced motion retains identity for 500ms without animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await observeBoot(page);
    await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveAttribute("data-phase", "reduced");
    await expect(page.locator(`${splash} .khora-splash-identity`)).toHaveCSS("opacity", "1");
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
        await page.goto("/sistema/custodia");
        await expect(page.locator(splash)).toHaveCSS("opacity", "1");
        await expect(page.locator(splash)).toHaveCSS("background-color", "rgb(0, 0, 0)");
        await expect(page.locator(`${splash} .khora-splash-identity`)).toHaveCSS("opacity", "0");
        await expect(page.locator('[data-testid="khora-shell"]')).toHaveCount(1);
    } finally { await context.close(); }
});

test("late local font cannot start a partial or independent exit clock", async ({ page }) => {
    await page.route(/\.woff2(?:\?|$)/, async route => {
        await new Promise(resolve => setTimeout(resolve, 250));
        await route.continue();
    });
    await observeBoot(page);
    await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveCount(0);
    const result = await evidence(page);
    expect(result.font).toBe("ready");
    expect(result.ended - result.started).toBeGreaterThanOrEqual(1170);
    expect(result.ended - result.started).toBeLessThanOrEqual(1250);
});

// Infrastructure failure is fail-open to the shell, never a fake font identity.
test("unavailable font releases the shell instead of displaying a fallback", async ({ page }) => {
    await page.route(/\.woff2(?:\?|$)/, async route => {
        await new Promise(resolve => setTimeout(resolve, 1800));
        if (!page.isClosed()) await route.continue();
    });
    await observeBoot(page);
    await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
    await expect(page.locator(splash)).toHaveCount(0, { timeout: 1500 });
    expect((await evidence(page)).started).toBe(0);
    await expect(page.locator('[data-testid="khora-shell"]')).toHaveCount(1);
});


test("bounded instances change only at a cold boot, never during one presentation", async ({ browser }) => {
    const seen = new Set<string>();
    for (const seed of [0, 1, 2, 117, 119, 0xffffffff]) {
        const context = await browser.newContext();
        try {
            const page = await context.newPage();
            await observeBoot(page, "dark", true, seed);
            await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
            await expect.poll(async () => (await evidence(page)).frozen).toBe(true);
            const mark = page.locator('[data-testid="intervalo-sonoro"]');
            const expected = ((seed ^ 0x496e7472) >>> 0) % 54;
            await expect(mark).toHaveAttribute("data-variant", String(expected));
            await expect(mark.locator("rect")).toHaveCount(6);
            await expect(mark.locator("path")).toHaveCount(1);
            const shape = await mark.innerHTML();
            seen.add(shape);
            await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
            await page.waitForTimeout(100);
            expect(await mark.innerHTML()).toBe(shape);
            await page.keyboard.press("Escape");
            await expect(page.locator(splash)).toHaveCount(0);
        } finally { await context.close(); }
    }
    expect(seen.size).toBeGreaterThan(1);
});

test("entropy failure still reveals the canonical professional mark", async ({ page }) => {
    await observeBoot(page, "light", true, null);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/sistema/custodia", { waitUntil: "domcontentloaded" });
    await expect.poll(async () => (await evidence(page)).frozen).toBe(true);
    await expect(page.locator('[data-testid="intervalo-sonoro"]')).toHaveAttribute("data-variant", "0");
    expect(errors).toEqual([]);
});
