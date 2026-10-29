import {cronicaUnits,validateCronica,CRONICA_INSTRUCTION,type CronicaProposal} from "../ingreso/cronica-editorial";
/** Uses the existing Groq service; no persistence, publication, audio or additional provider. */
export async function elaborarCronica(original:string,sourceHash:string,key:string,fetcher:typeof fetch=fetch):Promise<CronicaProposal>{
 if(!key)throw Error("CRONICA_PROVIDER_UNCONFIGURED");
 if(original.length>200000)throw Error("CRONICA_SOURCE_TOO_LARGE");
 const units=cronicaUnits(original);
 let response:Response;
 try{response=await fetcher("https://api.groq.com/openai/v1/chat/completions",{
  method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},signal:AbortSignal.timeout(45000),
  body:JSON.stringify({model:process.env.GROQ_PULIDO_MODEL||"llama-3.3-70b-versatile",temperature:0,max_tokens:16000,response_format:{type:"json_object"},messages:[{role:"system",content:CRONICA_INSTRUCTION},{role:"user",content:JSON.stringify({units:units.map((u,index)=>({index,text:u.quote}))})}]})
 });}catch{throw Error("CRONICA_PROVIDER_UNAVAILABLE");}
 if(!response.ok)throw Error("CRONICA_PROVIDER_UNAVAILABLE");
 let outer:any;try{outer=await response.json();}catch{throw Error("CRONICA_RESPONSE_INVALID");}
 if(outer?.choices?.[0]?.finish_reason!=="stop")throw Error("CRONICA_RESPONSE_INCOMPLETE");
 let result:unknown;try{result=JSON.parse(outer.choices[0].message.content);}catch{throw Error("CRONICA_RESPONSE_INVALID");}
 return validateCronica(original,sourceHash,result);
}
