import { type NextRequest, NextResponse } from "next/server"

let persistedSessions: Record<
  string,
  {
    id: string
    createdAt: number
    status: "active" | "entries-closed" | "completed"
    winner?: string
    winnerNumber?: number
    numbers: Record<number, { username: string; userId: number }>
    startTime: number
    endTime?: number
    entriesClosedAt?: number
  }
> = {}

const sessionTimers: Map<string, NodeJS.Timeout> = new Map()

function initializeSessions() {
  // Sessions are now properly maintained in memory with proper cleanup
  if (!persistedSessions || typeof persistedSessions !== "object") {
    persistedSessions = {}
  }
}

initializeSessions()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const sessionId = searchParams.get("sessionId")

  if (action === "list") {
    const sessions = Object.values(persistedSessions)
      .map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        status: session.status,
        winner: session.winner,
        winnerNumber: session.winnerNumber,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({ sessions }, { headers: { "Cache-Control": "no-store" } })
  }

  if (action === "get" && sessionId) {
    const session = persistedSessions[sessionId]
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      )
    }

    const numbersCopy: Record<number, { username: string; userId: number }> = {}
    Object.entries(session.numbers).forEach(([key, value]) => {
      numbersCopy[Number.parseInt(key)] = { ...value }
    })

    return NextResponse.json(
      {
        id: session.id,
        status: session.status,
        numbers: numbersCopy,
        winner: session.winner,
        winnerNumber: session.winnerNumber,
        createdAt: session.createdAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, sessionId, number, username, userId } = body

  if (action === "create") {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    persistedSessions[newSessionId] = {
      id: newSessionId,
      createdAt: Date.now(),
      status: "active",
      numbers: {},
      startTime: Date.now(),
    }
    return NextResponse.json({ id: newSessionId }, { headers: { "Cache-Control": "no-store" } })
  }

  if (action === "selectNumber" && sessionId && number !== undefined && username && userId !== undefined) {
    const session = persistedSessions[sessionId]
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      )
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Entries are closed" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      )
    }

    const userAlreadySelected = Object.values(session.numbers).some((selection) => selection.userId === userId)
    if (userAlreadySelected) {
      return NextResponse.json(
        { error: "You have already selected a number in this session" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      )
    }

    // Check if number is already selected by another user
    if (session.numbers[number]) {
      return NextResponse.json(
        { error: "Number already selected" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      )
    }

    session.numbers[number] = { username, userId }
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  }

  if (action === "closeEntries" && sessionId) {
    const session = persistedSessions[sessionId]
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      )
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Entries already closed" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      )
    }

    session.status = "entries-closed"
    session.entriesClosedAt = Date.now()

    if (sessionTimers.has(sessionId)) {
      clearTimeout(sessionTimers.get(sessionId)!)
      sessionTimers.delete(sessionId)
    }

    const timer = setTimeout(() => {
      try {
        const currentSession = persistedSessions[sessionId]
        if (currentSession && currentSession.status === "entries-closed") {
          const selectedNumbers = Object.entries(currentSession.numbers)
            .filter(([_, selection]) => selection && selection.username)
            .map(([num]) => Number.parseInt(num))

          if (selectedNumbers.length > 0) {
            const randomIndex = Math.floor(Math.random() * selectedNumbers.length)
            const winnerNumber = selectedNumbers[randomIndex]
            const winnerData = currentSession.numbers[winnerNumber]

            currentSession.status = "completed"
            currentSession.winner = winnerData.username
            currentSession.winnerNumber = winnerNumber
            currentSession.endTime = Date.now()
          }
        }
      } catch (error) {
        console.error("[v0] Error in winner selection timer:", error)
      } finally {
        sessionTimers.delete(sessionId)
      }
    }, 10000)

    sessionTimers.set(sessionId, timer)
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  }

  if (action === "selectWinner" && sessionId) {
    const session = persistedSessions[sessionId]
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      )
    }

    const selectedNumbers = Object.entries(session.numbers)
      .filter(([_, selection]) => selection && selection.username)
      .map(([num]) => Number.parseInt(num))

    if (selectedNumbers.length === 0) {
      return NextResponse.json(
        { error: "No selections made" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      )
    }

    const randomIndex = Math.floor(Math.random() * selectedNumbers.length)
    const winnerNumber = selectedNumbers[randomIndex]
    const winnerData = session.numbers[winnerNumber]

    session.status = "completed"
    session.winner = winnerData.username
    session.winnerNumber = winnerNumber
    session.endTime = Date.now()

    return NextResponse.json(
      { winner: winnerData.username, winnerNumber },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  if (action === "delete" && sessionId) {
    if (sessionTimers.has(sessionId)) {
      clearTimeout(sessionTimers.get(sessionId)!)
      sessionTimers.delete(sessionId)
    }
    delete persistedSessions[sessionId]
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: { "Cache-Control": "no-store" } })
}
