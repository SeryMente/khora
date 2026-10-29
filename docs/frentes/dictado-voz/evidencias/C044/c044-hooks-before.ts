declare const process: {env: {readonly NODE_ENV?: string; [key:string]: string|undefined}};
declare function beforeEach(fn:()=>void):void; declare function afterEach(fn:()=>void):void;
const authEnvironmentKeys = ["NODE_ENV", "VERCEL_ENV", "KHORA_READONLY_DATABASE_URL"] as const;
let authEnvironment: Array<[typeof authEnvironmentKeys[number], string | undefined]>;
beforeEach(() => {
  authEnvironment = authEnvironmentKeys.map(key => [key, process.env[key]]);
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "test";
  delete process.env.KHORA_READONLY_DATABASE_URL;
});
afterEach(() => {
  for (const [key, value] of authEnvironment) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
