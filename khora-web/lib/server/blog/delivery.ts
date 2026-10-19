import { maySendFacebook, type Revision, type TargetState } from './domain';
import type { Receipt } from './providers';
export interface DeliveryStore {
  // Must lock editorial+target rows and revalidate approval/source before claiming.
  claim(id:string,revision:number,target:'blog'|'facebook'):Promise<{revision:Revision;state:TargetState;blog:TargetState;externalId:string|null}|null>;
  // Implement atomically, durable BEFORE any non-idempotent network POST.
  transition(id:string,revision:number,target:'blog'|'facebook',state:TargetState,data?:{externalId?:string;receipt?:Receipt;code?:string}):Promise<void>;
}
export interface BlogDriver {publish: (e:Revision['entry'])=>Promise<{id:string}>;verify:(e:Revision['entry'])=>Promise<Receipt|null>}
export interface FacebookDriver {publish:(url:string,choice:Revision['facebook'])=>Promise<string>;verify:(id:string,url:string,choice:Revision['facebook'])=>Promise<Receipt|null>}
// Durable outbox algorithm. Unknown Facebook POST is NEVER blindly retried.
export async function deliver(store:DeliveryStore,blog:BlogDriver,facebook:FacebookDriver|null,id:string,revision:number,target:'blog'|'facebook'){
  const job=await store.claim(id,revision,target);if(!job)return 'not_claimed';
  const r=job.revision;const url='https://serymente.github.io/otrogranprograma/blog/entradas/'+r.entry.slug+'/';
  if(target==='facebook'&&!maySendFacebook(job.blog,job.state)&&job.state!=='submitting'&&job.state!=='unknown')return 'blocked';
  if(target==='facebook'&&!facebook)return 'unconfigured';
  if(target==='facebook'&&(job.state==='unknown'||job.state==='submitting')){
    // Known ID can be reconciled by read; without one require verified administrative reconciliation.
    if(!job.externalId){await store.transition(id,revision,target,'blocked',{code:'META_RECONCILIATION_REQUIRED'});return 'reconciliation_required';}
    const receipt=await facebook!.verify(job.externalId,url,r.facebook);
    if(receipt){await store.transition(id,revision,target,'confirmed',{receipt});return 'confirmed';}await store.transition(id,revision,target,'unknown',{code:'META_CONFIRMATION_PENDING'});return 'reconciliation_required';
  }
  if(target==='blog'){
    try{
      let receipt=await blog.verify(r.entry);
      if(!receipt){await store.transition(id,revision,target,'submitting');await blog.publish(r.entry);receipt=await blog.verify(r.entry);}
      await store.transition(id,revision,target,receipt?'confirmed':'unknown',receipt?{receipt}:{code:'PAGES_NOT_YET_VERIFIED'});return receipt?'confirmed':'pending_verification';
    }catch{await store.transition(id,revision,target,'unknown',{code:'BLOG_VERIFY_REQUIRED'});return 'pending_verification';}
  }
  await store.transition(id,revision,target,'submitting');
  try{
    const externalId=await facebook!.publish(url,r.facebook);
    await store.transition(id,revision,target,'unknown',{externalId});
    const receipt=await facebook!.verify(externalId,url,r.facebook);
    if(receipt){await store.transition(id,revision,target,'confirmed',{receipt});return 'confirmed';}
    return 'reconciliation_required';
  }catch{await store.transition(id,revision,target,'unknown',{code:'META_RESULT_UNKNOWN'});return 'reconciliation_required';}
}
