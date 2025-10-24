"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trash2, Plus, Lock } from "lucide-react"

interface GameSession {
  id: string
  createdAt: number
  status: "active" | "entries-closed" | "completed"
  winner?: string
  winnerNumber?: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adminSession = localStorage.getItem("adminSession")
    if (!adminSession) {
      router.push("/")
      return
    }

    fetchSessions()
    const interval = setInterval(fetchSessions, 2000)
    setLoading(false)
    return () => clearInterval(interval)
  }, [router])

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/game?action=list")
      if (response.ok) {
        const data = await response.json()
        const sortedSessions = data.sessions.sort((a: GameSession, b: GameSession) => b.createdAt - a.createdAt)
        setSessions(sortedSessions)
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

  const createNewSession = async () => {
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      })

      if (response.ok) {
        const data = await response.json()
        fetchSessions()
      }
    } catch (error) {
      console.error("Error creating session:", error)
    }
  }

  const deleteSession = async (id: string) => {
    try {
      await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", sessionId: id }),
      })
      fetchSessions()
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }

  const closeEntries = async (id: string) => {
    try {
      await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "closeEntries", sessionId: id }),
      })
      fetchSessions()
    } catch (error) {
      console.error("Error closing entries:", error)
    }
  }

  const viewSession = (id: string) => {
    router.push(`/game?session=${id}`)
  }

  const handleLogout = () => {
    localStorage.removeItem("adminSession")
    router.push("/")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="mb-6">
          <Button onClick={createNewSession} className="gap-2">
            <Plus size={20} />
            Create New Game Session
          </Button>
        </div>

        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No game sessions yet. Create one to get started!</p>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Session: {session.id}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Created: {getTimeAgo(session.createdAt)}</p>
                    <p className="text-sm mb-2">
                      Status:{" "}
                      <span
                        className={`font-semibold ${
                          session.status === "active"
                            ? "text-green-600"
                            : session.status === "entries-closed"
                              ? "text-orange-600"
                              : "text-blue-600"
                        }`}
                      >
                        {session.status === "entries-closed" ? "ENTRIES CLOSED" : session.status.toUpperCase()}
                      </span>
                    </p>
                    {session.status === "completed" && session.winner && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm font-semibold text-green-800">Winner: {session.winner}</p>
                        <p className="text-sm text-green-700">Winning Number: {session.winnerNumber}</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {session.status === "active" && (
                        <Button variant="default" onClick={() => router.push(`/game?session=${session.id}`)}>
                          View Game
                        </Button>
                      )}
                      {session.status === "active" && (
                        <Button variant="secondary" onClick={() => closeEntries(session.id)} className="gap-2">
                          <Lock size={16} />
                          Close Entries
                        </Button>
                      )}
                      {session.status === "completed" && (
                        <Button variant="default" onClick={() => viewSession(session.id)}>
                          View Winner
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteSession(session.id)} className="gap-2">
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
