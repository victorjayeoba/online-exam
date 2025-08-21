import { promises as fs } from "fs"
import path from "path"

export interface ExamSubmission {
  id: string
  timestampIso: string
  studentName: string
  score: number
  totalQuestions: number
  cheatingLogs: string[]
  warningCount: number
  answers: Record<number, string>
  fullscreenExits: number
}

interface DatabaseSchema {
  submissions: ExamSubmission[]
}

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "exams.json")

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(DATA_FILE)
  } catch {
    const initial: DatabaseSchema = { submissions: [] }
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8")
  }
}

async function readDb(): Promise<DatabaseSchema> {
  await ensureDataFile()
  const raw = await fs.readFile(DATA_FILE, "utf-8")
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.submissions) return { submissions: [] }
    return parsed as DatabaseSchema
  } catch {
    return { submissions: [] }
  }
}

async function writeDb(db: DatabaseSchema): Promise<void> {
  await ensureDataFile()
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8")
}

export async function addSubmission(submission: Omit<ExamSubmission, "id" | "timestampIso">): Promise<ExamSubmission> {
  const db = await readDb()
  const created: ExamSubmission = {
    id: crypto.randomUUID(),
    timestampIso: new Date().toISOString(),
    ...submission,
  }
  db.submissions.unshift(created)
  await writeDb(db)
  return created
}

export async function getAllSubmissions(): Promise<ExamSubmission[]> {
  const db = await readDb()
  return db.submissions
} 