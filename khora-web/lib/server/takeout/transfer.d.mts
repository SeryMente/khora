import type { EncryptedStore } from './encrypted-store.mjs';
export const TRANSFER_VERSION:'0.1.0';
export const CHUNK_BYTES:number;
export const MAX_ARCHIVE_BYTES:number;
export class TransferError extends Error {code:string;constructor(code:string)}
export type TransferReceipt={transfer_version:'0.1.0';owner:string;job_id:string;file_id:string;size:number;version:string;mimeType:string;status:'transferring'|'stored_verified';next_offset:number;archive_sha256:string|null;parts:{start:number;bytes:number;sha256:string;reference:string}[]};
export function driveFileId(input:string):string;
export function validateReceipt(receipt:unknown,owner:string):TransferReceipt;
export function beginTransfer(args:{owner:string;source:string;accessToken:string;jobId?:string;fetcher?:typeof fetch}):Promise<TransferReceipt>;
export function advanceTransfer(args:{receipt:TransferReceipt;owner:string;accessToken:string;store:EncryptedStore;fetcher?:typeof fetch}):Promise<TransferReceipt>;
export function verifyRestoration(args:{receipt:TransferReceipt;owner:string;store:EncryptedStore}):Promise<{verified:true;bytes:number;sha256:string}>;
