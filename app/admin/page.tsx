"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { listenAllSessions, deleteSession as fbDeleteSession } from "../../sessionService" // ✅ Fixed import for /src/sessionService.js

export default function AdminPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const username = localStorage.getItem("adminUsername")
    const password = localStorage.getItem("adminPassword")

    // ✅ Restrict access if not logged in
    if (username !== "admin" || password !== "1234") {
      router.push("/admin/login")
    } else {
      // ✅ Live listen to all Firebase sessions
      const unsubscribe = listenAllSessions((data) => {
        setSessions(data)
        setLoading(false)
      })
      return () => unsubscribe && unsubscribe()
    }
  }, [router])

  // ✅ Handle delete session
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      await fbDeleteSession(id)
    }
  }

  if (loading) return <p style={{ padding: "20px" }}>Loading sessions...</p>

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>Admin Panel</h1>

      {sessions.length === 0 ? (
        <p>No sessions available.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sessions.map((session: any) => (
            <li
              key={session.id}
              style={{
                marginBottom: "15px",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            >
              <p><strong>Session ID:</strong> {session.id}</p>
              {session.username && <p><strong>Username:</strong> {session.username}</p>}
              {session.score && <p><strong>Score:</strong> {session.score}</p>}
              <button
                style={{
                  backgroundColor: "#ff4d4d",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
                onClick={() => handleDelete(session.id)}
              >
                Delete Session
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
  }
