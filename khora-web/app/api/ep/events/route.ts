import { appendEpEvents, authenticateEpBearer, IncomingEpEvent } from "@/lib/server/ep";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const payload=await authenticateEpBearer(req,["ep:logs:write"]);const body=await req.json();
    const events=(Array.isArray(body)?body:body?.events||[body]) as IncomingEpEvent[];
    const inserted=await appendEpEvents(payload,events);
    return NextResponse.json({ok:true,sessionId:payload.sid,inserted},{headers:{"Cache-Control":"no-store"}});
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Evento rechazado"},{status:401});}
}
