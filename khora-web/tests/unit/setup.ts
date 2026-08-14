// @l0 L0-002-R · @req CORA-02/REQ-1
import { builtinModules } from "module";

// Mock next-auth before anyone imports it
const mockNextAuth = function () {
  return {
    auth: async () => ({ user: { email: "test@example.com", name: "Test Operator" } }),
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
