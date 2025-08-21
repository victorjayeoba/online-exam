export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { createAdminSession } from "@/lib/adminSession"

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const { token, maxAgeSeconds } = createAdminSession()
    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
      secure: process.env.NODE_ENV === "production",
    })
    return res
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
} 