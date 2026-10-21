export const DRIVE_SCOPE: "https://www.googleapis.com/auth/drive.file";
export type GoogleConfig={clientId:string;clientSecret:string;allowedOrigin:string;redirectUri:string};
export function beginDriveAuthorization(args:{owner:string;config:GoogleConfig;now?:number}):{authorization_url:string;cookie_state:string;transaction:any};
export function finishDriveAuthorization(args:{owner:string;state:string;cookieState:string;code:string;config:GoogleConfig;consume:(key:string,owner:string)=>Promise<any>;fetcher?:typeof fetch;now?:number}):Promise<any>;
export function refreshDriveAuthorization(args:{owner:string;grant:any;config:GoogleConfig;fetcher?:typeof fetch;now?:number}):Promise<any>;
