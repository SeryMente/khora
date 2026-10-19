import {NextResponse} from 'next/server';
import {auth} from '@/auth';
import {blogRepository} from '@/lib/server/blog/service';
import {revisionHash,type Revision} from '@/lib/server/blog/domain';
import {assertNormativeTurnOpen,openNormativeTurn} from '@/lib/server/mcp-normative';
import {assertNormativeRuntimeContext,REQUIRED_PLATFORM,REQUIRED_OUTPUT_FORMAT_VERSION,type ReasoningMode} from '@/lib/server/normative-runtime';
import {getMcpConfig} from '@/lib/server/mcp-config';
export const runtime='nodejs';
// One authenticated owner endpoint for Ingreso. This never archives a capture or publishes by itself.
export async function POST(req:Request){
 const session=await auth();const actor=session?.user?.email;
 if(!actor)return NextResponse.json({code:'AUTH_REQUIRED'},{status:401});
 const config=getMcpConfig();
 if(!config||config.allowedEmail.toLowerCase()!==actor.toLowerCase()||req.headers.get('origin')!==config.issuer)return NextResponse.json({code:'ORIGIN_FORBIDDEN'},{status:403});
 let body:any;try{const raw=await req.text();if(raw.length>240000)return NextResponse.json({code:'TOO_LARGE'},{status:413});body=JSON.parse(raw);}catch{return NextResponse.json({code:'JSON_INVALID'},{status:400});}
 // Refusal only cancels unsent work; never grants publication or reads originals.
 // Keep archiving/refusal operational when normative upstream prevents positive authorization.
 if(body.action==='decide'&&body.decision===false){
  try{const repo=blogRepository();await repo.decline(actor,body.publicationId,body.digest);return NextResponse.json(await repo.status(actor,body.publicationId));}
  catch{return NextResponse.json({code:'DECLINE_NOT_RECORDED'},{status:409});}
 }
 if(body.action==='open_turn'){
  try{
   assertNormativeRuntimeContext({platform:REQUIRED_PLATFORM,reasoning_mode:body._thinking_mode,output_format_version:body._output_format_version});
   const turn=await openNormativeTurn(actor,{conversation_id:'blog-editorial-session',runtime:{platform:REQUIRED_PLATFORM,reasoning_mode:body._thinking_mode as ReasoningMode,output_format_version:REQUIRED_OUTPUT_FORMAT_VERSION}});
   return NextResponse.json(turn,{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({code:'NORMATIVE_TURN_UNAVAILABLE'},{status:503});}
 }
 try{
  assertNormativeRuntimeContext({platform:REQUIRED_PLATFORM,reasoning_mode:body._thinking_mode,output_format_version:body._output_format_version});
  await assertNormativeTurnOpen(actor,body._norm_turn_token,{platform:REQUIRED_PLATFORM,reasoning_mode:body._thinking_mode as ReasoningMode,output_format_version:REQUIRED_OUTPUT_FORMAT_VERSION});
 }catch{return NextResponse.json({code:'NORMATIVE_TURN_REQUIRED'},{status:409});}
 try{
  const repo=blogRepository();
  if(body.action==='prepare'){
   const r=body.revision as Revision;const digest=revisionHash(r);
   await repo.save(actor,r,body.expectedRevision??null);
   let metadata:any;try{metadata={state:'proposed',result:await repo.extractMetadata(actor,r.publicationId,process.env.GROQ_API_KEY||'')};}catch{metadata={state:'pending',code:'METADATA_NOT_EXTRACTED'};}
   return NextResponse.json({metadata,publicationId:r.publicationId,revision:r.revision,digest,preview:r.entry,facebook:r.facebook,question:'¿Quieres que esta entrada se publique en el blog y en la Página de Facebook?',destinations:['blog','facebook']});
  }
  if(body.action==='decide'&&typeof body.decision==='boolean'){
   if(body.decision)await repo.approveExact(actor,body.publicationId,body.digest,body.obfuscatedExposure===true);
   else await repo.decline(actor,body.publicationId,body.digest);
   return NextResponse.json(await repo.status(actor,body.publicationId));
  }
  if(body.action==='status')return NextResponse.json(await repo.status(actor,body.publicationId));
  return NextResponse.json({code:'ACTION_INVALID'},{status:400});
 }catch(e){
  const code=e instanceof Error&&/^[A-Z_]+$/.test(e.message)?e.message:'EDITORIAL_OPERATION_FAILED';
  return NextResponse.json({code},{status:409}); // no SQL, text or credentials in error payload
 }
}
