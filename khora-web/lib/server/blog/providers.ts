import { canonical, hash, publicEntry, type PublicEntry, type FacebookChoice } from './domain';
export type Receipt={id:string;url:string;proofHash:string};
const site='https://serymente.github.io/otrogranprograma/blog/';
// No tokens in URLs, thrown errors, returned objects or persisted logs.
async function json(response:Response,code:string){if(!response.ok)throw new Error(code+'_'+response.status);return response.json();}
export class GitHubBlog {
  #token:string; fetcher:typeof fetch;
  constructor(token:string,fetcher:typeof fetch=fetch){if(!token)throw new Error('GITHUB_PUBLISHER_UNCONFIGURED');this.#token=token;this.fetcher=fetcher;}
  async request(path:string,init:RequestInit={}){return this.fetcher('https://api.github.com/repos/SeryMente/otrogranprograma/'+path,{...init,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${this.#token}`,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'}});}
  async publish(e:PublicEntry):Promise<{id:string}>{
    e=publicEntry(e);const path=`contents/blog/entries/${e.slug}.json`;const old=await this.request(path+'?ref=main');
    if(old.ok){const d=await old.json();const decoded=JSON.parse(Buffer.from(d.content,'base64').toString('utf8'));
      if(canonical(decoded)===canonical(e))return {id:d.sha};
      // Updating an existing public slug requires an explicit separately reviewed update operation.
      throw new Error('PUBLIC_SLUG_CONFLICT');
    }if(old.status!==404)throw new Error('GITHUB_READ_FAILED_'+old.status);
    const result=await json(await this.request(path,{method:'PUT',body:JSON.stringify({message:`blog: publish ${e.slug}`,branch:'main',content:Buffer.from(JSON.stringify(e,null,2)+'\n').toString('base64')})}),'GITHUB_WRITE_FAILED');
    return {id:result.commit.sha};
  }
  async verify(e:PublicEntry):Promise<Receipt|null>{
    // Source archive and rendered article must both independently match approved content.
    const a=await this.fetcher(site+'archivo.json',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!a.ok)return null;
    const archive=await a.json();const entries=Array.isArray(archive)?archive:archive.entries;
    if(!Array.isArray(entries)||!entries.some((x:PublicEntry)=>canonical(x)===canonical(e)))return null;
    const url=site+'entradas/'+encodeURIComponent(e.slug)+'/';
    const page=await this.fetcher(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});if(!page.ok)return null;
    const html=await page.text();
    // Generator escapes text; compare its escaped title and every paragraph, not HTTP status alone.
    const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
    const prose='<div class="prose">'+e.body.trim().split(/\n\s*\n/).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('')+'</div>';
    if(!html.includes('<h1>'+esc(e.title)+'</h1>')||!html.includes(prose)||!html.includes('href="'+url+'"'))return null;
    return {id:e.slug,url,proofHash:hash(canonical(e))};
  }
}
export class MetaPage {
  #token:string;pageId:string;fetcher:typeof fetch;
  constructor(pageToken:string,verifiedPageId:string,fetcher:typeof fetch=fetch){if(!pageToken||!/^[0-9]+$/.test(verifiedPageId))throw new Error('META_UNCONFIGURED');this.#token=pageToken;this.pageId=verifiedPageId;this.fetcher=fetcher;}
  async request(path:string,init:RequestInit={}){if(!/^[a-zA-Z0-9_/?=,&.-]+$/.test(path))throw new Error('META_PATH');return this.fetcher('https://graph.facebook.com/v26.0/'+path,{...init,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${this.#token}`,'Content-Type':'application/json'}});}
  async verifyIdentity():Promise<{id:string;name:string}>{
    const p=await json(await this.request('me?fields=id,name'),'META_IDENTITY_FAILED');
    if(p.id!==this.pageId)throw new Error('META_PAGE_MISMATCH');return {id:p.id,name:p.name};
  }
  async publish(url:string,choice:FacebookChoice):Promise<string>{
    if(!url.startsWith(site+'entradas/'))throw new Error('META_APPROVAL_REQUIRED');
    await this.verifyIdentity();
    const body=choice.format==='link'?{message:choice.message,link:url}:{message:choice.message};
    const r=await json(await this.request(this.pageId+'/feed',{method:'POST',body:JSON.stringify(body)}),'META_SEND_FAILED');
    if(typeof r.id!=='string'||!r.id.startsWith(this.pageId+'_'))throw new Error('META_RESPONSE_UNCERTAIN');return r.id;
  }
  async verify(postId:string,url:string,choice:FacebookChoice):Promise<Receipt|null>{
    if(!new RegExp('^'+this.pageId+'_[0-9]+$').test(postId))return null;
    const p=await json(await this.request(postId+'?fields=id,message,permalink_url,attachments{url,target}'),'META_VERIFY_FAILED');
    const links=(p.attachments?.data||[]).flatMap((a:any)=>[a.url,a.target?.url]);
    if(p.id!==postId||p.message!==choice.message||choice.format==='link'&&!links.includes(url)||typeof p.permalink_url!=='string'||!p.permalink_url.startsWith('https://www.facebook.com/'))return null;
    return {id:p.id,url:p.permalink_url,proofHash:hash(canonical({message:p.message,url:choice.format==='link'?url:null}))};
  }
}
// Administrative discovery: authenticated User token, bounded pagination; never follow paging.next (may embed tokens).
export async function discoverPage(userToken:string,expectedPageId:string,fetcher:typeof fetch=fetch){
  let after='';
  for(let page=0;page<20;page++){
    const response=await fetcher('https://graph.facebook.com/v26.0/me/accounts?fields=id,name,tasks,access_token&limit=100'+(after?'&after='+encodeURIComponent(after):''),{headers:{Authorization:`Bearer ${userToken}`},redirect:'error',signal:AbortSignal.timeout(20000)});
    const d=await json(response,'META_DISCOVERY_FAILED');
    const match=(d.data||[]).find((p:any)=>p.id===expectedPageId);
    if(match){if(!match.tasks?.includes('CREATE_CONTENT')||!match.access_token)throw new Error('META_PAGE_TASKS_REQUIRED');return {id:match.id,name:match.name,pageToken:match.access_token,tasks:match.tasks};}
    if(!d.paging?.next)return null;
    const next=d.paging?.cursors?.after;if(typeof next!=='string'||next===after)throw new Error('META_CURSOR_INVALID');after=next;
  }throw new Error('META_DISCOVERY_LIMIT');
}
