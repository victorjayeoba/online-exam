"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Hard-coded login credentials
    if (username === "testing" && password === "testing") {
      router.push("/exam")
    } else {
      setError("Invalid username or password. Try username: testing, password: testing")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#8B0000]">Online Exam Portal</h1>
          <div className="mt-2 h-1 w-20 bg-[#8B0000] mx-auto rounded-full"></div>
          <p className="mt-4 text-gray-600">Please sign in with your credentials</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 block w-full border-gray-300 focus:border-[#8B0000] focus:ring-[#8B0000]"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-[#8B0000] focus:ring-[#8B0000]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-[#8B0000] hover:text-[#6B0000]">
                Forgot password?
              </a>
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#8B0000] hover:bg-[#6B0000] text-white">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
