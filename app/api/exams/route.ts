export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { addSubmission, getAllSubmissions } from "@/lib/storage"
import { validateAdminSession } from "@/lib/adminSession"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      studentName,
      score,
      totalQuestions,
      cheatingLogs,
      warningCount,
      answers,
      fullscreenExits,
    } = body || {}

    if (!studentName || typeof studentName !== "string") {
      return NextResponse.json({ error: "studentName is required" }, { status: 400 })
    }

    const created = await addSubmission({
      studentName,
      score: Number(score) ?? 0,
      totalQuestions: Number(totalQuestions) ?? 0,
      cheatingLogs: Array.isArray(cheatingLogs) ? cheatingLogs : [],
      warningCount: Number(warningCount) ?? 0,
      answers: answers && typeof answers === "object" ? answers : {},
      fullscreenExits: Number(fullscreenExits) ?? 0,
    })

    return NextResponse.json({ submission: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value
  if (!validateAdminSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const submissions = await getAllSubmissions()
  return NextResponse.json({ submissions })
} 