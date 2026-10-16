import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer!;
export default defineConfig({
  ...base, use: { ...base.use, baseURL: "http://127.0.0.1:3177" },
  webServer: { ...server, command: server.command!.replace("npm run start", "npm run start -- --port 3177").replace("./node_modules/.bin/next start", "./node_modules/.bin/next start -p 3177"), url: "http://127.0.0.1:3177", reuseExistingServer: false, timeout: 300_000 },
});
