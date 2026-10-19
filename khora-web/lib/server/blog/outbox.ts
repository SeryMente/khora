import {randomUUID} from 'node:crypto';
import { BlogRepository } from './repository';
import { publishable, revisionHash, type Revision, type Approval, type TargetState } from './domain';
import type { Receipt } from './providers';
import type { DeliveryStore } from './delivery';
export class PostgresDelivery implements DeliveryStore {
  repo:BlogRepository;actor:string;leases=new Map<string,string>();
  constructor(repo:BlogRepository,actor:string){if(!actor)throw new Error('ACTOR_REQUIRED');this.repo=repo;this.actor=actor;}
  async claim(id:string,revision:number,target:'blog'|'facebook'){
    return this.repo.transaction(async c=>{
      const e=await c.query('SELECT * FROM blog_editorial WHERE id=$1 AND owner=$2 FOR UPDATE',[id,this.actor]);
      if(!e.rows.length||e.rows[0].revision!==revision||e.rows[0].consent!=='approved')return null;
      const row=e.rows[0],r:Revision=JSON.parse(this.repo.cipher.decrypt(row.payload_cipher));
      const a:Approval=JSON.parse(this.repo.cipher.decrypt(row.approval_cipher));
      publishable(r,a,this.actor,await this.repo.source(c,this.actor,r.sourceId,r.sourceVersion));
      const q=await c.query("SELECT * FROM blog_delivery WHERE editorial_id=$1 AND revision=$2 AND target=$3 AND (lease_until IS NULL OR lease_until<now()) FOR UPDATE",[id,revision,target]);
      if(!q.rows.length||['confirmed','cancelled','blocked'].includes(q.rows[0].state))return null;
      const job=q.rows[0];if(job.digest!==revisionHash(r))throw new Error('DELIVERY_APPROVAL_CHANGED');
      const b=await c.query("SELECT state FROM blog_delivery WHERE editorial_id=$1 AND revision=$2 AND target='blog'",[id,revision]);
      const blog:TargetState=b.rows[0]?.state||'pending';
      if(target==='facebook'&&blog!=='confirmed')return null;
      if(job.attempts>=5&&job.state==='pending')return null;
      const token=randomUUID();
      await c.query("UPDATE blog_delivery SET lease_until=now()+interval '120 seconds',lease_token=$4,updated_at=now() WHERE editorial_id=$1 AND revision=$2 AND target=$3",[id,revision,target,token]);
      this.leases.set(id+':'+revision+':'+target,token);
      return {revision:r,state:job.state as TargetState,blog,externalId:job.external_id||null};
    });
  }
  async transition(id:string,revision:number,target:'blog'|'facebook',state:TargetState,data?:{externalId?:string;receipt?:Receipt;code?:string}){
    await this.repo.transaction(async c=>{
      const q=await c.query('SELECT * FROM blog_editorial WHERE id=$1 AND owner=$2 FOR UPDATE',[id,this.actor]);
      if(!q.rows.length||q.rows[0].revision!==revision||q.rows[0].consent!=='approved')throw new Error('DELIVERY_APPROVAL_CHANGED');
      const r:Revision=JSON.parse(this.repo.cipher.decrypt(q.rows[0].payload_cipher));
      const allowed=['pending','submitting','unknown','confirmed','blocked','cancelled'];if(!allowed.includes(state))throw new Error('DELIVERY_STATE');
      if(state==='confirmed'&&!data?.receipt)throw new Error('DELIVERY_PROOF_REQUIRED');
      const result=await c.query(`UPDATE blog_delivery SET state=$4,external_id=COALESCE($5,external_id),url=COALESCE($6,url),proof_hash=COALESCE($7,proof_hash),last_code=$8,attempts=attempts+CASE WHEN $4='submitting' THEN 1 ELSE 0 END,lease_until=CASE WHEN $4 IN ('submitting','unknown') THEN lease_until ELSE NULL END,updated_at=now() WHERE editorial_id=$1 AND revision=$2 AND target=$3 AND state NOT IN ('confirmed','cancelled') AND (attempts<5 OR $4<>'submitting') AND lease_token=$9 RETURNING target`,[id,revision,target,state,data?.receipt?.id||data?.externalId||null,data?.receipt?.url||null,data?.receipt?.proofHash||null,data?.code||null,this.leases.get(id+':'+revision+':'+target)||null]);
      if(!result.rows.length)throw new Error('DELIVERY_CONFLICT');
      await c.query('UPDATE blog_editorial SET changed_seq=DEFAULT,updated_at=now() WHERE id=$1',[id]);
      await this.repo.history(c,this.actor,r,'delivery_'+target+'_'+state,{target,state,receipt:data?.receipt||null,code:data?.code||null});
    });
  }
}
