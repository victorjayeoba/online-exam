import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { validateAdminSession, deleteAdminSession } from "@/lib/adminSession"
import { getAllSubmissions } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import SubmissionsTable from "@/components/admin/SubmissionsTable"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!validateAdminSession(token)) {
    redirect("/admin/login")
  }

  const submissions = await getAllSubmissions()

  async function handleLogout() {
    'use server'
    const cookieStore = await cookies()
    const token = cookieStore.get("admin_session")?.value
    deleteAdminSession(token)
    cookieStore.set("admin_session", "", { maxAge: 0, path: "/" })
    redirect("/admin/login")
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exam Submissions</h1>
        <form action={handleLogout}>
          <Button type="submit" variant="outline">Logout</Button>
        </form>
      </div>

      <SubmissionsTable submissions={submissions} />
    </div>
  )
} 