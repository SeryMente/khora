import { defineConfig, devices } from "@playwright/test";

const envVars = "NEXT_PUBLIC_API_URL=http://127.0.0.1:3999 PLAYWRIGHT_TEST_RUN=1 PLAYWRIGHT_TEST_BYPASS=true MCP_OAUTH_CLIENT_ID=mock-client-id MCP_OAUTH_CLIENT_SECRET=mock-client-secret MCP_OAUTH_REDIRECT_URIS=http://localhost:3000/callback MCP_ALLOWED_EMAIL=test@example.com MCP_CANONICAL_URL=http://localhost:3000/api/mcp KHORA_READONLY_DATABASE_URL=postgres://localhost:5432/mock DATABASE_URL=postgres://localhost:5432/mock KHORA_UI_REVIEW_MODE=1";

export default defineConfig({
	testDir: "./",
	// Bundled Geist and SVG identity references use explicit viewport/theme names.
	snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{-projectName}{ext}",
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
				...(process.env.PLAYWRIGHT_STORAGE_STATE_PATH && { storageState: process.env.PLAYWRIGHT_STORAGE_STATE_PATH })
			},
		},
	],
	webServer: {
		command: process.platform === "win32"
			? "cmd /c \"set NEXT_PUBLIC_API_URL=http://127.0.0.1:3999&& set PLAYWRIGHT_TEST_RUN=1&& set PLAYWRIGHT_TEST_BYPASS=true&& set MCP_OAUTH_CLIENT_ID=mock-client-id&& set MCP_OAUTH_CLIENT_SECRET=mock-client-secret&& set MCP_OAUTH_REDIRECT_URIS=http://localhost:3000/callback&& set MCP_ALLOWED_EMAIL=test@example.com&& set MCP_CANONICAL_URL=http://localhost:3000/api/mcp&& set KHORA_READONLY_DATABASE_URL=postgres://localhost:5432/mock&& set DATABASE_URL=postgres://localhost:5432/mock&& set KHORA_UI_REVIEW_MODE=1&& npm run build && set MCP_JWT_SECRET=mock-jwt-secret-at-least-32-chars-long&& npm run start\""
			: `${envVars} npm run build && ${envVars} MCP_JWT_SECRET=mock-jwt-secret-at-least-32-chars-long ./node_modules/.bin/next start`,
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: Number(process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS || 120_000),
	},
});
