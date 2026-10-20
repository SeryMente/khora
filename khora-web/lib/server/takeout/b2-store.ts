import { createHash } from 'node:crypto';
import { cifrarBytes, descifrarBytes } from '../cripto';
import { putEncryptedObject, fetchStoredObject, storageLocation } from '../object-storage';
import { parseB2ObjectUrl } from '../../storage/object-reference';
import { createEncryptedStore } from './encrypted-store.mjs';
/** Session/DB owner verification is REQUIRED; no implicit allow callback. */
export function bindTakeoutStore(authorize:(owner:string,prefix:string,operation:'read'|'write')=>Promise<boolean>) {
  return createEncryptedStore({
    encrypt:cifrarBytes, decrypt:descifrarBytes,
    hashOwner:(owner:string)=>createHash('sha256').update(owner).digest('hex'),
    authorize,
    referenceWithin:(reference:string,prefix:string)=>{
      const key=parseB2ObjectUrl(reference,storageLocation());
      return key!==null&&key.startsWith(prefix+'/')&&/^[0-9]+-[0-9a-f-]{36}\.khc$/.test(key.slice(prefix.length+1));
    },
    put:async(path:string,data:Buffer)=>(await putEncryptedObject(path,data,{access:'public',contentType:'application/octet-stream'})).url,
    read:async(reference:string,maxBytes:number)=>{
      const response=await fetchStoredObject(reference);
      if(!response.ok||!response.body)throw new Error('takeout_read_failed');
      const reader=response.body.getReader(),chunks:Buffer[]=[];let bytes=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;
        if(bytes>maxBytes)throw new Error('takeout_read_limit');chunks.push(Buffer.from(value));}
        return Buffer.concat(chunks,bytes);
      }finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
    }
  });
}
