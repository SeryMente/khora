import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {getCurrentSiSnapshot,getCurrentMethodologySnapshot} from '@/lib/server/norm-check';
import {blogRepository} from '@/lib/server/blog/service';
import {PostgresDelivery} from '@/lib/server/blog/outbox';
import {deliver} from '@/lib/server/blog/delivery';
import {GitHubBlog,MetaPage} from '@/lib/server/blog/providers';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:Request){
 const key=process.env.BLOG_DISPATCH_SECRET||'';const supplied=req.headers.get('authorization')||'';
 const expected='Bearer '+key;
 if(key.length<32||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
 // Explicit text-only cut: audio remains private; all existing authorization gates remain.
 if(process.env.BLOG_SYNC_ENABLED!=='1')return NextResponse.json({code:'BLOG_SYNC_DISABLED'},{status:503});
 // Dedicated service executes already approved immutable jobs, not model ingestion/ratification.
 // Preserve the normative upstream dependency; unavailable credentials block sends, never bypass.
 try{await getCurrentSiSnapshot();await getCurrentMethodologySnapshot();}catch{return NextResponse.json({code:'NORMATIVE_SOURCE_UNAVAILABLE'},{status:503});}
 if(!process.env.BLOG_GITHUB_TOKEN||!process.env.BLOG_META_PAGE_TOKEN||process.env.BLOG_META_PAGE_ID!=='61595788700651'||process.env.BLOG_META_ADMIN_VERIFIED!=='1')return NextResponse.json({code:'BLOG_PROVIDER_UNCONFIGURED'},{status:503});
 try{
  const repo=blogRepository();
  // At most ONE target per request bounds runtime. Repeated schedule picks only unconfirmed targets.
  const q=await repo.db.query(`SELECT e.id,e.owner,e.revision,d.target FROM blog_editorial e JOIN blog_delivery d ON d.editorial_id=e.id AND d.revision=e.revision WHERE e.consent='approved' AND d.state IN ('pending','unknown','submitting') AND (d.attempts<5 OR d.state<>'pending') AND (d.lease_until IS NULL OR d.lease_until<now()) AND (d.target='blog' OR EXISTS(SELECT 1 FROM blog_delivery b WHERE b.editorial_id=e.id AND b.revision=e.revision AND b.target='blog' AND b.state='confirmed')) ORDER BY d.updated_at,e.id,d.target LIMIT 1`);
  if(!q.rows.length)return NextResponse.json({code:'NO_PENDING_TARGET'});
  const row=q.rows[0],meta=new MetaPage(process.env.BLOG_META_PAGE_TOKEN,process.env.BLOG_META_PAGE_ID);
  await meta.verifyIdentity();
  const result=await deliver(new PostgresDelivery(repo,row.owner),new GitHubBlog(process.env.BLOG_GITHUB_TOKEN),meta,row.id,row.revision,row.target);
  return NextResponse.json({code:'BLOG_DELIVERY_CHECKED',publicationId:row.id,revision:row.revision,target:row.target,result});
 }catch{return NextResponse.json({code:'BLOG_DISPATCH_FAILED'},{status:503});}
}
