/** Reuses the existing KHC1 crypto and object transport through trusted bindings.
 * No global configuration, credentials, ownership inference or plaintext fallback.
 */
import { TransferError, CHUNK_BYTES } from './transfer.mjs';
const ownerHash=/^[a-f0-9]{64}$/;
function stop(code){throw new TransferError(code);}
function prefixForOwner(prefix,owner,hash){
  if(typeof owner!=='string'||!owner||!ownerHash.test(hash(owner))||typeof prefix!=='string'||!prefix.startsWith(`khora/takeout/${hash(owner)}/`)||!/^khora\/takeout\/[a-f0-9]{64}\/[A-Za-z0-9:_-]{1,160}$/.test(prefix))stop('STORE_SCOPE_INVALID');
}
export function createEncryptedStore({encrypt,decrypt,put,read,referenceWithin,authorize,hashOwner}) {
  for(const f of [encrypt,decrypt,put,read,referenceWithin,authorize,hashOwner])if(typeof f!=='function')stop('STORE_BINDINGS_REQUIRED');
  return {
    async write(path,data,{owner}) {
      const prefix=path.slice(0,path.lastIndexOf('/'));prefixForOwner(prefix,owner,hashOwner);
      if(!/\/[0-9]+\.khc$/.test(path)||!Buffer.isBuffer(data)||!data.length||data.length>CHUNK_BYTES)stop('STORE_INPUT_INVALID');
      if(await authorize(owner,prefix,'write')!==true)stop('STORE_OWNER_DENIED');
      const sealed=await encrypt(data);
      if(!Buffer.isBuffer(sealed)||sealed.length!==data.length+32||sealed.subarray(0,4).toString('ascii')!=='KHC1')stop('STORE_ENCRYPTION_REQUIRED');
      const reference=await put(path,sealed);
      if(!referenceWithin(reference,prefix))stop('STORE_REFERENCE_FOREIGN');
      return reference;
    },
    async read(reference,{owner,prefix,maxBytes}) {
      prefixForOwner(prefix,owner,hashOwner);
      if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>CHUNK_BYTES||!referenceWithin(reference,prefix))stop('STORE_REFERENCE_FOREIGN');
      if(await authorize(owner,prefix,'read')!==true)stop('STORE_OWNER_DENIED');
      const sealed=await read(reference,maxBytes+32);
      if(!Buffer.isBuffer(sealed)||sealed.length!==maxBytes+32||sealed.subarray(0,4).toString('ascii')!=='KHC1')stop('STORE_ENVELOPE_INVALID');
      // Mandatory magic before the legacy decryptor: it otherwise returns unmarked input.
      const raw=await decrypt(sealed);
      if(!Buffer.isBuffer(raw)||raw.length!==maxBytes)stop('STORE_DECRYPTION_INVALID');
      return raw;
    }
  };
}
