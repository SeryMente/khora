import type { Buffer } from 'node:buffer';
export type StoreScope={owner:string;prefix:string;maxBytes:number};
export type EncryptedStore={write(path:string,data:Buffer,scope:{owner:string}):Promise<string>;read(reference:string,scope:StoreScope):Promise<Buffer>};
export type StoreBindings={encrypt(data:Buffer):Buffer|Promise<Buffer>;decrypt(data:Buffer):Buffer|Promise<Buffer>;put(path:string,data:Buffer):Promise<string>;read(reference:string,maxBytes:number):Promise<Buffer>;referenceWithin(reference:string,prefix:string):boolean;authorize(owner:string,prefix:string,operation:'read'|'write'):Promise<boolean>;hashOwner(owner:string):string};
export function createEncryptedStore(bindings:StoreBindings):EncryptedStore;
