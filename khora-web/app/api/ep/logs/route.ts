import { authenticateEpBearer, readEpEvents } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const payload=await authenticateEpBearer(req,["ep:logs:read"]);
    const which=req.nextUrl.searchParams.get("which")==="last"?"last":"current";
    const limit=Number(req.nextUrl.searchParams.get("limit")||"5000");
    const data=await readEpEvents(payload,which,limit);
    if(req.nextUrl.searchParams.get("format")==="ndjson"){
      const lines=[JSON.stringify({type:"session",...data.session}),...data.events.map(event=>JSON.stringify({type:"event",...event}))].join("\n")+"\n";
      return new NextResponse(lines,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-store"}});
    }
    return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No autorizado"},{status:401});}
}
