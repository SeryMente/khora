// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
import { NextResponse } from "next/server";
import { auth } from "../../../auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let texto: string | null = null;
  let archivo_base64: string | null = null;
  let mime: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const textInput = formData.get("text") as string | null;

    if (file) {
      mime = file.type;
      const arrayBuffer = await file.arrayBuffer();
      archivo_base64 = Buffer.from(arrayBuffer).toString("base64");
    } else if (textInput) {
      texto = textInput;
    } else {
      return NextResponse.json({ error: "Must provide file or text" }, { status: 400 });
    }

    const payload = {
      texto,
      archivo_base64,
      mime,
      provenance: {
        origen: "cora-ui",
        driver: "web",
        timestamp: new Date().toISOString(),
      }
    };

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 60000); // 60s timeout

    const kernelUrl = process.env.KHORA_API_URL || "http://127.0.0.1:8000";
    const khoraKey = process.env.X_KHORA_KEY || "dummy-key"; // JAMÁS NEXT_PUBLIC

    try {
      const apiResponse = await fetch(`${kernelUrl}/api/v1/ingesta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KHORA-KEY": khoraKey,
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      clearTimeout(timeout);

      const data = await apiResponse.json();
      return NextResponse.json(data, { status: apiResponse.status });
    } catch (fetchError: any) {
      clearTimeout(timeout);
      if (fetchError.name === "AbortError") {
        return NextResponse.json({ error: "Request to kernel timed out" }, { status: 504 });
      }
      return NextResponse.json({ error: "Kernel request failed", details: fetchError.message }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "Bad Request", details: err.message }, { status: 400 });
  }
}
