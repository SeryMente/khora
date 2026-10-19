import test from "node:test";
import assert from "node:assert/strict";
import { isTechnicalEntry, shouldPresentBoot, BOOT_PRESENTATION_SCRIPT } from "../../lib/brand/boot-presentation";
test("boot presentation exhaustive navigation truth table", () => {
 for (const type of ["navigate", "reload", "back_forward", "prerender"]) for (const path of ["/", "/sistema/ingreso", "/auth/signin", "/api/auth/callback/oidc", "/oauth/authorize", "/ui-review", "/offline", "/capturar/compartir"]) for (const internal of [false,true]) for (const handoff of [false,true]) {
  assert.equal(shouldPresentBoot(type,path,internal,handoff), !isTechnicalEntry(path) && type !== "reload" && type !== "back_forward" && !internal && !handoff);
 }
});
test("technical matching never swallows similar product prefixes", () => {
 for (const path of ["/authority", "/apiary", "/oauthology", "/ui-reviewing", "/offliner", "/capturar/compartir-mas"]) assert.equal(isTechnicalEntry(path),false);
});
test("prepaint script is self-contained and never evaluates identity", () => {
 assert.doesNotThrow(() => new Function(BOOT_PRESENTATION_SCRIPT));
 for (const forbidden of ["fetch(","AUTH_SECRET","cookie","clientSecret"]) assert.equal(BOOT_PRESENTATION_SCRIPT.includes(forbidden), false);
});
