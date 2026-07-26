import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./",
testMatch: ["e2e/**/*.spec.ts", "tests/regression/**/*.spec.ts"],
	timeout: 60_000,
	expect: {
		timeout: 15_000,
	},
	fullyParallel: false,
	retries: 0,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// Support external storage state mapping without auto-generating it
				...(process.env.PLAYWRIGHT_STORAGE_STATE_PATH && { storageState: process.env.PLAYWRIGHT_STORAGE_STATE_PATH })
			},
		},
	],
	webServer: {
		command:
			"NEXT_PUBLIC_API_URL=http://127.0.0.1:3999 npm run build && npm run start",
		url: "http://localhost:3000",
		reuseExistingServer: true,
		timeout: 120_000,
	},
});
