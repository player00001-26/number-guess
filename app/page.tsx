"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

interface GameSession {
  id: string
  createdAt: number
  status: "active" | "entries-closed" | "completed"
  winner?: string
  winnerNumber?: number
}

export default function Home() {
  const router = useRouter()
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [adminId, setAdminId] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"player" | "admin">("player")
  const [loading, setLoading] = useState(true)
  const [allSessions, setAllSessions] = useState<GameSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()

      if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user
        setTelegramUser(user)
        localStorage.setItem("telegramUser", JSON.stringify(user))
      }
    }

    const adminSession = localStorage.getItem("adminSession")
    if (adminSession) {
      router.push("/admin")
      return
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    if (activeTab === "player") {
      fetchAllSessions()
      const interval = setInterval(fetchAllSessions, 3000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  const fetchAllSessions = async () => {
    try {
      const response = await fetch("/api/game?action=list", {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      })
      if (response.ok) {
        const data = await response.json()
        const sortedSessions = data.sessions.sort((a: GameSession, b: GameSession) => b.createdAt - a.createdAt)
        setAllSessions(sortedSessions)
        const activeSessions = sortedSessions.filter((s: GameSession) => s.status === "active")
        if (activeSessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(activeSessions[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
    }
  }

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
    return `${days} day${days > 1 ? "s" : ""} ago`
  }

  const handlePlayerJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!telegramUser) {
      setError("Unable to get Telegram user data")
      return
    }
    if (!selectedSessionId) {
      setError("Please select a game session")
      return
    }
    router.push(`/game?session=${selectedSessionId}`)
  }

  const handleViewWinner = (sessionId: string) => {
    router.push(`/game?session=${sessionId}&view=winner`)
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminId === "Player00001" && adminPassword === "Push@123") {
      localStorage.setItem("adminSession", "true")
      router.push("/admin")
    } else {
      setError("Invalid admin credentials")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <p className="text-lg">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-primary">Number Game</h1>

          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === "player" ? "default" : "outline"}
              onClick={() => {
                setActiveTab("player")
                setError("")
              }}
              className="flex-1"
            >
              Player
            </Button>
            <Button
              variant={activeTab === "admin" ? "default" : "outline"}
              onClick={() => {
                setActiveTab("admin")
                setError("")
              }}
              className="flex-1"
            >
              Admin
            </Button>
          </div>

          {activeTab === "player" ? (
            <div className="space-y-4">
              {telegramUser ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-muted-foreground mb-1">Telegram User</p>
                  <p className="font-semibold text-lg">
                    {telegramUser.first_name} {telegramUser.last_name || ""}
                  </p>
                  {telegramUser.username && <p className="text-sm text-muted-foreground">@{telegramUser.username}</p>}
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600">Unable to load Telegram user data</p>
                </div>
              )}

              {allSessions.filter((s) => !s.winner).length > 0 ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Current Sessions</label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a session</option>
                    {allSessions
                      .filter((s) => !s.winner)
                      .map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.id} - {getTimeAgo(session.createdAt)} - {session.status}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-700">No active sessions available</p>
                </div>
              )}

              {allSessions.filter((s) => s.winner).length > 0 ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Previous Sessions</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allSessions
                      .filter((s) => s.winner)
                      .map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{session.id}</p>
                            <p className="text-xs text-muted-foreground">{getTimeAgo(session.createdAt)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewWinner(session.id)}
                          >
                            View Winner
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-muted-foreground">No previous sessions</p>
                </div>
              )}

              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={!telegramUser || !selectedSessionId}
                onClick={handlePlayerJoin}
              >
                Join Game
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Admin ID</label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => {
                    setAdminId(e.target.value)
                    setError("")
                  }}
                  placeholder="Player00001"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value)
                    setError("")
                  }}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full">
                Admin Login
              </Button>
            </form>
          )}
        </div>
      </Card>
    </main>
  )
}
