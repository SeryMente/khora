import {test} from 'node:test';
import assert from 'node:assert/strict';
import {takeoutDbConfig} from '../../lib/server/takeout/db-config.mjs';
const base='postgresql://synthetic_user:synthetic_password@ep-example-pooler.us-east-1.aws.neon.tech/synthetic_db';
const reject=s=>assert.throws(()=>takeoutDbConfig(s),{message:'TAKEOUT_DB_CONFIGURATION_REJECTED'});
test('dedicated TLS config upgrades require without leaving pg URL override',()=>{
 const c=takeoutDbConfig(base+'?sslmode=require');
 assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(c.ssl.servername,new URL(base).hostname);
 assert.equal(new URL(c.connectionString).search,'');assert.equal(c.max,2);assert.equal(c.statement_timeout,20000);
});
test('verified modes remain verified and URL options cannot replace ssl',()=>{for(const mode of ['verify-ca','verify-full']){const c=takeoutDbConfig(base+'?sslmode='+mode);assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(new URL(c.connectionString).search,'')}});
test('no localhost or plaintext alternative even under test flags',()=>{for(const h of ['localhost','127.0.0.1','[::1]'])reject(base.replace(new URL(base).hostname,h));for(const m of ['disable','allow','prefer','no-verify',''])reject(base+'?sslmode='+m)});
test('reject custom certificate file paths and ssl object overrides',()=>{for(const p of ['sslcert=/tmp/cert','sslkey=/tmp/key','sslrootcert=/tmp/ca','ssl=false','ssl=true','sslnegotiation=direct'])reject(base+'?'+p)});
test('reject unsupported strict channel binding rather than silently weaken it',()=>reject(base+'?sslmode=require&channel_binding=require'));
test('reject duplicate and unrecognized connection options',()=>{for(const p of ['sslmode=require&sslmode=disable','application_name=other','options=-c%20log_statement=all','connect_timeout=0'])reject(base+'?'+p)});
test('reject suffix confusion, non-Neon endpoints and malformed hostnames',()=>{for(const h of ['neon.tech.evil.example','neon.tech','evil.example','foo..neon.tech','-foo.neon.tech'])reject(base.replace(new URL(base).hostname,h))});
test('require credentials database and standard port',()=>{reject(base.replace('synthetic_user:synthetic_password@',''));reject(base.replace(':synthetic_password',':'));reject(base.replace('/synthetic_db','/'));reject(base.replace('/synthetic_db',':5433/synthetic_db'))});
test('no URL fragment or control characters accepted',()=>{reject(base+'#secret');reject(base+'\n');reject(base+' ')});
test('errors do not reveal credentials, host or raw URL',()=>{try{takeoutDbConfig(base+'?sslmode=disable');assert.fail()}catch(e){assert.equal(e.message,'TAKEOUT_DB_CONFIGURATION_REJECTED');assert.equal(JSON.stringify(e).includes('synthetic_password'),false)}});
