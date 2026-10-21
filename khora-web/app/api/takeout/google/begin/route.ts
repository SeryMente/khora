import { NextResponse } from "next/server";import { auth } from "@/auth";
import { beginDriveAuthorization } from "@/lib/server/takeout/google-auth.mjs";
import { authTransactionStore, ensureTakeoutSchema, googleConfig } from "@/lib/server/takeout/runtime";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){const owner=(await auth())?.user?.email;if(!owner)return NextResponse.redirect(new URL("/auth/signin",googleConfig().allowedOrigin));await ensureTakeoutSchema();const begun=beginDriveAuthorization({owner,config:googleConfig()});await authTransactionStore(owner).put(begun.transaction,{owner});const r=NextResponse.redirect(begun.authorization_url);r.cookies.set("khora_takeout_oauth",begun.cookie_state,{httpOnly:true,secure:true,sameSite:"lax",path:"/api/takeout/google/callback",maxAge:600});return r;}
