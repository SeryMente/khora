import test from 'node:test';
import assert from 'node:assert/strict';
import {NAVIGATION_REGISTRY,NAVIGATION_EXEMPT_ROUTES} from '../../app/navigation/registry';
test('published Blog route retains Ingreso ownership without new menu or gate exemption',()=>{const entry=NAVIGATION_REGISTRY.find(e=>e.id==='ingreso');assert(entry);assert(entry.coverage.includes('/sistema/blog'));assert.equal(entry.kind,'direct');assert.equal(entry.href,'/sistema/ingreso');assert.equal(entry.children,undefined);assert.equal(NAVIGATION_EXEMPT_ROUTES.has('/sistema/blog'),false);assert.equal(NAVIGATION_REGISTRY.length,6);});
