export function takeoutDbConfig(connectionString:string): {
 connectionString:string;
 ssl:{rejectUnauthorized:true;servername:string};max:number;
 connectionTimeoutMillis:number;idleTimeoutMillis:number;query_timeout:number;
 statement_timeout:number;application_name:string;allowExitOnIdle:true;
};
