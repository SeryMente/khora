import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/neon";
import bcrypt from "bcryptjs";
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
const SESSION_TTL_MINUTES = parseInt(process.env.SESSION_TTL_MINUTES || '15', 10);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    let pool;
    try {
      pool = getDb();
    } catch (e) {
      // Allow early validation return for testing endpoints without DB config
      return NextResponse.json({ error: "Database not configured" }, { status: 401 });
    }

    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        pin_hash VARCHAR(255) NOT NULL
      );
    `);

    // Fetch the user (we assume id = 1 for the main user, or fetch any user if only one)
    const res = await pool.query('SELECT * FROM users ORDER BY id ASC LIMIT 1');
    const user = res.rows[0];

    // If no user exists, fail. The setup-db.ts script should be used for bootstrapping.
    if (!user) {
      return NextResponse.json({ error: "User not setup. Please run setup-db.ts." }, { status: 500 });
    }

    const isValid = await bcrypt.compare(pin, user.pin_hash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    const jwt = await new jose.SignJWT({ 'urn:khora:user': true })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_MINUTES}m`)
      .sign(secret);

    // Set cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'khora_session',
      value: jwt,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MINUTES * 60
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
