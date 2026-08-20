import { authenticateEpBearer, markBootstrapFetched } from "@/lib/server/ep";
import { BOOTSTRAP_PS1_BASE64 } from "@/lib/server/ep-bootstrap-content";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const payload=await authenticateEpBearer(req,["ep:bootstrap"]);await markBootstrapFetched(payload);
    const script=Buffer.from(BOOTSTRAP_PS1_BASE64,"base64").toString("utf8");
    return new NextResponse(script,{status:200,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  } catch(error){return NextResponse.json({error:"Token Khora invalido",detail:error instanceof Error?error.message:"unauthorized"},{status:401});}
}
