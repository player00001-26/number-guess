import { type NextRequest, NextResponse } from "next/server"
import { createSession, getSession, updateSession, deleteSession, getAllSessions } from "@/lib/firebase-admin"

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
      const sessions = await getAllSessions()
      const sortedSessions = (sessions || [])
        .map((session: any) => ({
          id: session.id,
          createdAt: session.createdAt,
          status: session.status,
          winner: session.winner,
          winnerNumber: session.winnerNumber,
        }))
        .sort((a: any, b: any) => b.createdAt - a.createdAt)

      return NextResponse.json({ sessions: sortedSessions }, { headers })
    }

    if (action === "get" && sessionId) {
      const session = await getSession(sessionId)
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
      }

      return NextResponse.json(session, { headers })
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
      try {
        const newSessionId = await createSession()
        return NextResponse.json({ id: newSessionId }, { headers })
      } catch (error) {
        console.error("[v0] Error creating session:", error)
        return NextResponse.json({ error: "Failed to create session" }, { status: 500, headers })
      }
    }

    if (action === "selectNumber" && sessionId && number !== undefined && username && userId !== undefined) {
      try {
        const session = await getSession(sessionId)
        if (!session) {
          return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
        }

        if (session.status !== "active") {
          return NextResponse.json({ error: "Entries are closed" }, { status: 400, headers })
        }

        const userAlreadySelected = Object.values(session.numbers || {}).some(
          (sel: any) => sel && typeof sel === "object" && sel.userId === userId,
        )
        if (userAlreadySelected) {
          return NextResponse.json(
            { error: "You have already selected a number in this session" },
            { status: 400, headers },
          )
        }

        if (session.numbers && session.numbers[number]) {
          return NextResponse.json({ error: "Number already selected" }, { status: 400, headers })
        }

        const updatedNumbers = session.numbers || {}
        updatedNumbers[number] = {
          username,
          userId,
          selectedAt: Date.now(),
        }

        await updateSession(sessionId, { numbers: updatedNumbers })
        return NextResponse.json({ success: true }, { headers })
      } catch (error) {
        console.error("[v0] Error in selectNumber:", error)
        return NextResponse.json({ error: "Failed to select number" }, { status: 500, headers })
      }
    }

    if (action === "closeEntries" && sessionId) {
      try {
        const session = await getSession(sessionId)
        if (!session) {
          return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
        }

        if (session.status !== "active") {
          return NextResponse.json({ error: "Entries already closed" }, { status: 400, headers })
        }

        await updateSession(sessionId, {
          status: "entries-closed",
          entriesClosedAt: Date.now(),
          timerStarted: true,
        })

        setTimeout(async () => {
          try {
            const currentSession = await getSession(sessionId)
            if (currentSession && currentSession.status === "entries-closed") {
              const selectedNumbers = Object.entries(currentSession.numbers || {})
                .filter(
                  ([_, selection]: [string, any]) => selection && typeof selection === "object" && selection.username,
                )
                .map(([num]) => Number(num))

              if (selectedNumbers.length > 0) {
                const randomIndex = Math.floor(Math.random() * selectedNumbers.length)
                const winnerNumber = selectedNumbers[randomIndex]
                const winnerData = currentSession.numbers[winnerNumber]

                if (winnerData && typeof winnerData === "object") {
                  await updateSession(sessionId, {
                    status: "completed",
                    winner: winnerData.username,
                    winnerNumber: winnerNumber,
                    endTime: Date.now(),
                  })
                }
              }
            }
          } catch (error) {
            console.error("[v0] Error in winner selection timer:", error)
          }
        }, 10000)

        return NextResponse.json({ success: true }, { headers })
      } catch (error) {
        console.error("[v0] Error in closeEntries:", error)
        return NextResponse.json({ error: "Failed to close entries" }, { status: 500, headers })
      }
    }

    if (action === "selectWinner" && sessionId) {
      try {
        const session = await getSession(sessionId)
        if (!session) {
          return NextResponse.json({ error: "Session not found" }, { status: 404, headers })
        }

        const selectedNumbers = Object.entries(session.numbers || {})
          .filter(([_, selection]: [string, any]) => selection && typeof selection === "object" && selection.username)
          .map(([num]) => Number(num))

        if (selectedNumbers.length === 0) {
          return NextResponse.json({ error: "No selections made" }, { status: 400, headers })
        }

        const randomIndex = Math.floor(Math.random() * selectedNumbers.length)
        const winnerNumber = selectedNumbers[randomIndex]
        const winnerData = session.numbers[winnerNumber]

        if (!winnerData || typeof winnerData !== "object") {
          return NextResponse.json({ error: "Winner data not found" }, { status: 500, headers })
        }

        await updateSession(sessionId, {
          status: "completed",
          winner: winnerData.username,
          winnerNumber: winnerNumber,
          endTime: Date.now(),
        })

        return NextResponse.json({ winner: winnerData.username, winnerNumber }, { headers })
      } catch (error) {
        console.error("[v0] Error in selectWinner:", error)
        return NextResponse.json({ error: "Failed to select winner" }, { status: 500, headers })
      }
    }

    if (action === "delete" && sessionId) {
      try {
        await deleteSession(sessionId)
        return NextResponse.json({ success: true }, { headers })
      } catch (error) {
        console.error("[v0] Error in delete:", error)
        return NextResponse.json({ error: "Failed to delete session" }, { status: 500, headers })
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers })
  } catch (error) {
    console.error("[v0] POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers })
  }
}
