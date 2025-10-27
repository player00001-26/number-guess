"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { listenAllSessions, deleteSession as fbDeleteSession } from "@/sessionService"

export default function AdminPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Load sessions in realtime when admin logs in
  useEffect(() => {
    const adminSession = localStorage.getItem("adminSession")
    if (!adminSession) {
      // Not logged in → redirect to home/login
      router.push("/")
      return
    }

    let unsubscribe: any

    ;(async () => {
      // Listen to Firebase sessions live
      unsubscribe = await listenAllSessions((all) => {
        const arr = Object.entries(all || {}).map(([id, v]) => ({ id, ...(v as any) }))
        // Sort latest first
        arr.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
        setSessions(arr)
        setLoading(false)
      })
    })()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [router])

  // Delete session with confirmation
  const deleteSession = async (id: string) => {
    const ok = confirm("Are you sure you want to delete this session?")
    if (!ok) return
    try {
      await fbDeleteSession(id)
      alert("Session deleted successfully!")
    } catch (err) {
      console.error("Delete failed:", err)
      alert("Failed to delete session.")
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold">Loading sessions...</h2>
      </div>
    )
  }

  // Main Admin UI
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      {sessions.length === 0 ? (
        <p>No sessions found.</p>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex justify-between items-center bg-gray-800 rounded-xl p-4 shadow-md"
            >
              <div>
                <p className="font-semibold">Session ID: {session.id}</p>
                <p className="text-sm text-gray-400">
                  Created: {new Date(session.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteSession(session.id)}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-semibold"
              >
                🗑 Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
          }
