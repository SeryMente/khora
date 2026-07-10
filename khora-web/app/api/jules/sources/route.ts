import { NextResponse } from "next/server";
import { listSources, JulesApiError } from "@/lib/jules/client";

export async function GET() {
  try {
    const data = await listSources();
    return NextResponse.json({
      status: 200,
      payload: data
    }, { status: 200 });
  } catch (error) {
    if (error instanceof JulesApiError) {
      return NextResponse.json({
        status: error.status,
        error: error.message,
        payload: error.data
      }, { status: error.status });
    }

    return NextResponse.json({
      status: 500,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
