import type {TransferReceipt} from "./transfer.mjs";
export const PIPELINE_VERSION:string;export const ZIP_LIMITS:Readonly<Record<string,number>>;
export function verifyArchiveStep(args:any):Promise<{done:boolean;receipt:TransferReceipt;checkpoint:any}>;
export function parseZipStep(args:any):Promise<{done:boolean;cursor:any;sources:Array<{entry:number;name:string;bytes:number;sha256:string;text:string}>;index:any[];readBytes:number}>;
export function checkedZipEntry(entry:any):string;export function crc32(data:Buffer):number;
