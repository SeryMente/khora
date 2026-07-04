import { NextRequest, NextResponse } from "next/server";
import { isNotionConfigured } from "@/lib/notion";

export async function GET(req: NextRequest) {
	try {
		return NextResponse.json({
			notionConfigured: isNotionConfigured(),
			geminiConfigured: !!process.env.GEMINI_API_KEY,
		});
	} catch (e) {
		return NextResponse.json({ notionConfigured: false, geminiConfigured: false });
	}
}
