export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { deleteAdminSession } from "@/lib/adminSession"

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value
  deleteAdminSession(token)
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: "admin_session",
    value: "",
    maxAge: 0,
    path: "/",
  })
  return res
} 