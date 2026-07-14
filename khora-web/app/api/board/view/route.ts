import { NextResponse } from 'next/server';

export const revalidate = 60; // Cache de 60 s para no golpear la API de Notion.

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_ROADMAP_DATABASE_ID;

  if (!token || !databaseId) {
    return NextResponse.json({ success: false, error: "not_configured" }, { status: 500 });
  }

  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        page_size: 100,
      }),
      // Using Next.js fetch options for revalidation cache
      next: { revalidate: 60 } 
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ success: true, data });
    }
    
    const errorData = await response.json();
    return NextResponse.json({ success: false, error: errorData }, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
