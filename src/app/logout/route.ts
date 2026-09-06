import { NextResponse } from "next/server";
import { getClientEnv } from "@/lib/env";
import { clearSession } from "@/server/auth";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(new URL("/login", getClientEnv().NEXT_PUBLIC_APP_URL));
}
