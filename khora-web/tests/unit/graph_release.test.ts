import test from "node:test";
import assert from "node:assert/strict";
import {GET} from "../../app/api/version/route";
const keys=["VERCEL_GIT_COMMIT_SHA","NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA","KHORA_RELEASE_SHA"];
async function isolated(values:Record<string,string>,check:(j:any)=>void){const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));try{for(const k of keys)delete process.env[k];Object.assign(process.env,values);check(await (await GET()).json());}finally{for(const k of keys){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}}}
test("manual verified release does not impersonate Git deployment",()=>isolated({KHORA_RELEASE_SHA:"a".repeat(40)},j=>{assert.equal(j.commit,"a".repeat(40));assert.equal(j.desplegado_desde_git,false);assert.equal(j.fuente_commit,"manual-verified-clean-worktree");}));
test("actual Git metadata takes precedence over manual release",()=>isolated({VERCEL_GIT_COMMIT_SHA:"b".repeat(40),KHORA_RELEASE_SHA:"a".repeat(40)},j=>{assert.equal(j.commit,"b".repeat(40));assert.equal(j.desplegado_desde_git,true);assert.equal(j.fuente_commit,"vercel-git");}));
test("missing or malformed manual identity remains unverified",()=>isolated({KHORA_RELEASE_SHA:"not-a-commit"},j=>{assert.equal(j.commit,"sin-metadatos-de-git");assert.equal(j.desplegado_desde_git,false);assert.equal(j.fuente_commit,"no-verificado");}));
