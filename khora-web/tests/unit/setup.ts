// @l0 L0-002-R · @req CORA-02/REQ-1
import { builtinModules } from "module";

process.env.PLAYWRIGHT_TEST_RUN ??= "1";
process.env.AUTH_SECRET ??= "test-secret-12345678901234567890123456789012";
process.env.X_KHORA_KEY ??= "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

// Mock next-auth before anyone imports it
const mockNextAuth = function () {
  const authFn = function (handler?: any) {
    if (typeof handler === "function") {
      return async (req: any, ctx: any) => handler(req, ctx);
    }
    return Promise.resolve({ user: { email: "test@example.com", name: "Test Operator" } });
  };

  return {
    auth: authFn,
    handlers: {},
    signIn: async () => {},
    signOut: async () => {}
  };
};

mockNextAuth.default = mockNextAuth;

const nextAuthPath = require.resolve("next-auth");
require.cache[nextAuthPath] = {
  id: nextAuthPath,
  filename: nextAuthPath,
  loaded: true,
  exports: mockNextAuth
} as any;
