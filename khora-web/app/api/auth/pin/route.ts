import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import bcrypt from "bcryptjs";
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get('khora_session');
    if (!cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jose.jwtVerify(cookie.value, secret);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPin, newPin } = body;

    if (!currentPin || !newPin) {
      return NextResponse.json({ error: "currentPin and newPin are required" }, { status: 400 });
    }

    let pool;
    try {
      pool = getDb();
    } catch (e) {
      return NextResponse.json({ error: "Database not configured" }, { status: 401 });
    }

    const res = await pool.query('SELECT * FROM users ORDER BY id ASC LIMIT 1');
    const user = res.rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPin, user.pin_hash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid current PIN" }, { status: 401 });
    }

    const hash = await bcrypt.hash(newPin, 10);
    await pool.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [hash, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change PIN error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
