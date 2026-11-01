import { NextResponse } from "next/server";

const retired = () => NextResponse.json(
  {
    error: "NOT_AVAILABLE_IN_CORA",
    code: "JULES_RUNTIME_RETIRED",
    migration_target: "OCP MCP",
    status: "MIGRATION_PENDING",
  },
  { status: 410 },
);

export async function GET() {
  return retired();
}

export async function POST() {
  return retired();
}
