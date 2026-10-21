import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BLOG_META_API_PAGE_ID,BLOG_META_PUBLIC_PROFILE_ID,blogProvidersConfigured} from '../../lib/server/blog/provider-config';
const fixture=()=>({BLOG_GITHUB_TOKEN:'synthetic-github',BLOG_META_PAGE_TOKEN:'synthetic-page',BLOG_META_PAGE_ID:BLOG_META_API_PAGE_ID,BLOG_META_ADMIN_VERIFIED:'1'});
test('verified Graph Page ID differs from canonical public profile ID',()=>{assert.equal(BLOG_META_API_PAGE_ID,'1354217727781437');assert.equal(BLOG_META_PUBLIC_PROFILE_ID,'61595788700651');assert.notEqual(String(BLOG_META_API_PAGE_ID),String(BLOG_META_PUBLIC_PROFILE_ID));});
test('verified API ID plus all explicit gates accepted',()=>assert.equal(blogProvidersConfigured(fixture()),true));
for(const pageId of [BLOG_META_PUBLIC_PROFILE_ID,'123','',undefined,' '+BLOG_META_API_PAGE_ID])test('reject wrong/missing Page ID '+String(pageId),()=>assert.equal(blogProvidersConfigured({...fixture(),BLOG_META_PAGE_ID:pageId}),false));
for(const k of ['BLOG_GITHUB_TOKEN','BLOG_META_PAGE_TOKEN','BLOG_META_ADMIN_VERIFIED'])for(const v of ['',undefined,'   '])test('missing provider attestation '+k+' '+String(v),()=>assert.equal(blogProvidersConfigured({...fixture(),[k]:v}),false));
test('administrative attestation cannot be truthy text',()=>assert.equal(blogProvidersConfigured({...fixture(),BLOG_META_ADMIN_VERIFIED:'true'}),false));
test('configuration check returns only boolean and never serializes tokens',()=>{const env=fixture();assert.equal(JSON.stringify(blogProvidersConfigured(env)),'true');assert.deepEqual(env,fixture());});
test('dispatch uses verified provider gate, preserves authentication/normativity/order/identity',()=>{
 const route=readFileSync(new URL('../../app/api/blog/dispatch/route.ts',import.meta.url),'utf8');
 assert(route.includes('blogProvidersConfigured(providerEnv)'));assert(!route.includes("BLOG_META_PAGE_ID!=='61595788700651'"));
 assert(route.includes('timingSafeEqual'));assert(route.includes("process.env.BLOG_SYNC_ENABLED!=='1'"));
 assert(route.includes('await getCurrentSiSnapshot();await getCurrentMethodologySnapshot();'));
 assert(route.includes('new MetaPage(providerEnv.BLOG_META_PAGE_TOKEN,providerEnv.BLOG_META_PAGE_ID)'));assert(route.includes('await meta.verifyIdentity()'));
 assert(route.includes("e.consent='approved'"));assert(route.includes("b.state='confirmed'"));assert(route.includes('LIMIT 1'));
});
