export const INSERT_AUTH_TRANSACTION:string;export const CONSUME_AUTH_TRANSACTION:string;
export function createAuthTransactionStore(args:any):{put(transaction:any,ctx:{owner:string;now?:number}):Promise<{stored:true}>;consume(key:string,owner:string,ctx?:{now?:number}):Promise<any|null>};
