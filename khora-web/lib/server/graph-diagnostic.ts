// Read-only provider diagnostics: never send source text or expose credentials.
export async function graphProviderDiagnostic(){
 const model=process.env.GROQ_GRAPH_MODEL||process.env.GROQ_PULIDO_MODEL||"llama-3.3-70b-versatile";
 const key=process.env.GROQ_API_KEY;
 if(!key)return {configured:false,model,status:"graph_provider_not_configured"};
 try{
  const r=await fetch("https://api.groq.com/openai/v1/models",{headers:{Authorization:`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!r.ok)return {configured:true,model,http_status:r.status,status:"graph_provider_http_"+r.status};
  const body=await r.json();const available=Array.isArray(body.data)&&body.data.some((m:{id?:unknown})=>m.id===model);
  return {configured:true,model,http_status:r.status,model_available:available,status:available?"provider_model_available":"graph_provider_model_unavailable"};
 }catch(e){return {configured:true,model,status:e instanceof Error&&/timeout|abort/i.test(e.name)?"graph_provider_diagnostic_timeout":"graph_provider_diagnostic_failed"};}
}
export function graphSafeFailure(e:unknown){
 const message=e instanceof Error?e.message:"unknown";
 return /^(?:graph_|approved_|concurrent_|extractor_|active_proposal_|judgment_|invalid_extraction|provenance_|leiden_)[a-zA-Z0-9_:-]{0,160}$/.test(message)?message:"graph_operation_failed";
}
