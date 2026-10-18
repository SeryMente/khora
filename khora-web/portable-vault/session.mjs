import {createHash} from 'node:crypto';
/** Accept ONLY a session already verified by Khora's auth(), not input from the client. */
export function principalFromVerifiedSession(session,cookieHeader,now=Date.now()){
 const email=session?.user?.email,expires=Date.parse(session?.expires||'');
 if(typeof email!=='string'||!email.trim()||!Number.isFinite(expires)||expires<=now)return null;
 const parts=String(cookieHeader||'').split(';').map(x=>x.trim()).filter(x=>/^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/.test(x)).sort();
 if(!parts.length)return null;
 return {subject:email.trim().toLowerCase(),binding:createHash('sha256').update(parts.join(';')).digest('hex')};
}
