import { type NextRequest, NextResponse } from "next/server"

// Using a more robust session manager with proper data structures and concurrent request handling

interface SessionSelection {
  username: string
  userId: number
  selectedAt: number
}

interface GameSession {
  id: string
  createdAt: number
  status: "active" | "entries-closed" | "completed"
  winner?: string
  winnerNumber?: number
  numbers: Map<number, SessionSelection>
  startTime: number
  endTime?: number
  entriesClosedAt?: number
  timerStarted?: boolean
}

// Global session storage with improved structure
const sessionStore = new Map<string, GameSession>()
const sessionTimers = new Map<string, NodeJS.Timeout>()
const sessionLocks = new Map<string, boolean>()

// Helper function to acquire lock for concurrent request handling
function acquireLock(sessionId: string): boolean {
  if (sessionLocks.get(sessionId)) {
    return false
  }
  sessionLocks.set(sessionId, true)
  return true
}

function releaseLock(sessionId: string): void {
  sessionLocks.delete(sessionId)
}

// Helper function to safely get session
function getSession(sessionId: string): GameSession | null {
  const session = sessionStore.get(sessionId)
  if (!session) return null
  return session
}

// Helper function to safely create session
function createSession(sessionId: string): GameSession {
  const session: GameSession = {
    id: sessionId,
    createdAt: Date.now(),
    status: "active",
    numbers: new Map(),
    startTime: Date.now(),
  }
  sessionStore.set(sessionId, session)
  return session
}

// Helper function to serialize session for response
function serializeSession(session: GameSession) {
  const numbersObj: Record<number, SessionSelection> = {}
  session.numbers.forEach((value, key) => {
    numbersObj[key] = value
  })

  return {
    id: session.id,
    createdAt: session.createdAt,
    status: session.status,
    winner: session.winner,
    winnerNumber: session.winnerNumber,
    numbers: numbersObj,
    startTime: session.startTime,
    endTime: session.endTime,
    entriesClosedAt: session.entriesClosedAt,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const sessionId = searchParams.get("sessionId")

  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  try {
    if (action === "list") {
      const sessions = Array.from(sessionStore.values())
        .map((session) => ({
          id: session.id,
          createdAt: session.createdAt,
          status: session.status,
          winner: session.winner,
          winnerNumber: session.winnerNumber,
        }))
        .sort((a, b) => b.createdAt - a.createdAt)

      return NextResponse.json({ sessions }, { headers })
    }

    if (action === "get" && sessionId) {
      const session = getSession(sessionId)
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
      }

      return NextResponse.json(serializeSession(session), { headers })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers })
  } catch (error) {
    console.error("[v0] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers })
  }
}

export async function POST(request: NextRequest) {
  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  try {
    const body = await request.json()
    const { action, sessionId, number, username, userId } = body

    if (action === "create") {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      createSession(newSessionId)
      return NextResponse.json({ id: newSessionId }, { headers })
    }

    if (action === "selectNumber" && sessionId && number !== undefined && username && userId !== undefined) {
      // Acquire lock to prevent race conditions
      let lockAcquired = false
      let attempts = 0
      while (!lockAcquired && attempts < 10) {
        lockAcquired = acquireLock(sessionId)
        if (!lockAcquired) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
        attempts++
      }

      if (!lockAcquired) {
        return NextResponse.json({ error: "Session is busy, please try again" }, { status: 429, headers })
      }

      try {
        const session = getSession(sessionId)
        if (!session) {
          return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
        }

        if (session.status !== "active") {
          return NextResponse.json({ error: "Entries are closed" }, { status: 400, headers })
        }

        // Check if user already selected
        const userAlreadySelected = Array.from(session.numbers.values()).some((sel) => sel.userId === userId)
        if (userAlreadySelected) {
          return NextResponse.json(
            { error: "You have already selected a number in this session" },
            { status: 400, headers },
          )
        }

        // Check if number is already selected
        if (session.numbers.has(number)) {
          return NextResponse.json({ error: "Number already selected" }, { status: 400, headers })
        }

        session.numbers.set(number, {
          username,
          userId,
          selectedAt: Date.now(),
        })

        return NextResponse.json({ success: true }, { headers })
      } finally {
        releaseLock(sessionId)
      }
    }

    if (action === "closeEntries" && sessionId) {
      const session = getSession(sessionId)
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
      }

      if (session.status !== "active") {
        return NextResponse.json({ error: "Entries already closed" }, { status: 400, headers })
      }

      session.status = "entries-closed"
      session.entriesClosedAt = Date.now()
      session.timerStarted = true

      // Clear existing timer if any
      if (sessionTimers.has(sessionId)) {
        clearTimeout(sessionTimers.get(sessionId)!)
        sessionTimers.delete(sessionId)
      }

      // Set new timer for winner selection
      const timer = setTimeout(() => {
        try {
          const currentSession = getSession(sessionId)
          if (currentSession && currentSession.status === "entries-closed") {
            const selectedNumbers = Array.from(currentSession.numbers.entries())
              .filter(([_, selection]) => selection && selection.username)
              .map(([num]) => num)

            if (selectedNumbers.length > 0) {
              const randomIndex = Math.floor(Math.random() * selectedNumbers.length)
              const winnerNumber = selectedNumbers[randomIndex]
              const winnerData = currentSession.numbers.get(winnerNumber)

              if (winnerData) {
                currentSession.status = "completed"
                currentSession.winner = winnerData.username
                currentSession.winnerNumber = winnerNumber
                currentSession.endTime = Date.now()
              }
            }
          }
        } catch (error) {
          console.error("[v0] Error in winner selection timer:", error)
        } finally {
          sessionTimers.delete(sessionId)
        }
      }, 10000)

      sessionTimers.set(sessionId, timer)
      return NextResponse.json({ success: true }, { headers })
    }

    if (action === "selectWinner" && sessionId) {
      const session = getSession(sessionId)
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
      }

      const selectedNumbers = Array.from(session.numbers.entries())
        .filter(([_, selection]) => selection && selection.username)
        .map(([num]) => num)

      if (selectedNumbers.length === 0) {
        return NextResponse.json({ error: "No selections made" }, { status: 400, headers })
      }

      const randomIndex = Math.floor(Math.random() * selectedNumbers.length)
      const winnerNumber = selectedNumbers[randomIndex]
      const winnerData = session.numbers.get(winnerNumber)

      if (!winnerData) {
        return NextResponse.json({ error: "Winner data not found" }, { status: 500, headers })
      }

      session.status = "completed"
      session.winner = winnerData.username
      session.winnerNumber = winnerNumber
      session.endTime = Date.now()

      return NextResponse.json({ winner: winnerData.username, winnerNumber }, { headers })
    }

    if (action === "delete" && sessionId) {
      if (sessionTimers.has(sessionId)) {
        clearTimeout(sessionTimers.get(sessionId)!)
        sessionTimers.delete(sessionId)
      }
      sessionStore.delete(sessionId)
      sessionLocks.delete(sessionId)
      return NextResponse.json({ success: true }, { headers })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers })
  } catch (error) {
    console.error("[v0] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers })
  }
}
