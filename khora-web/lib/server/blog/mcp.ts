import {getMcpReadOnlyDb} from '../mcp-db';
import {publicEntry} from './domain';
// Read only the explicit public projection. No source ciphertext/table query; actor from Bearer handler.
export async function blogChanges(actor:string,after='0',limit=20){
 if(!actor||!/^\d{1,18}$/.test(after)||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('BLOG_CURSOR_INVALID');
 const q=await getMcpReadOnlyDb().query('SELECT id,revision,changed_seq,snapshot,digest,withdrawn,deliveries FROM blog_public_export WHERE owner=$1 AND changed_seq>$2::bigint ORDER BY changed_seq LIMIT $3',[actor,after,limit]);
 const items=q.rows.map(r=>({publicationId:r.id,revision:r.revision,cursor:String(r.changed_seq),digest:r.digest,withdrawn:r.withdrawn,entry:r.snapshot?publicEntry(r.snapshot):null,deliveries:r.deliveries}));
 return {items,next:items.length?items.at(-1)!.cursor:after};
}
export async function blogPublicStatus(actor:string,id:string){
 if(!actor)throw new Error('BLOG_ACTOR_REQUIRED');
 const q=await getMcpReadOnlyDb().query('SELECT id,revision,snapshot,digest,withdrawn,deliveries FROM blog_public_export WHERE owner=$1 AND id=$2',[actor,id]);
 if(!q.rows.length)throw new Error('BLOG_NOT_FOUND');const r=q.rows[0];
 return {publicationId:r.id,revision:r.revision,digest:r.digest,withdrawn:r.withdrawn,entry:r.snapshot?publicEntry(r.snapshot):null,deliveries:r.deliveries};
}
