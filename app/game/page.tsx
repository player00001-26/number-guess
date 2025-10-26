"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import GameBoard from "@/components/game-board"
import WinnerDisplay from "@/components/winner-display"
import GameCharacter from "@/components/game-character"
import SelectionConfirmDialog from "@/components/selection-confirm-dialog"
import { LogOut, Lock } from "lucide-react"

interface GameSession {
  id: string
  createdAt: number
  status: "active" | "entries-closed" | "completed"
  winner?: string
  winnerNumber?: number
}

interface SessionData {
  numbers: Record<number, string>
  startTime: number
  endTime?: number
  winner?: string
  winnerNumber?: number
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

export default function GamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [sessionId, setSessionId] = useState("")
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [gameStatus, setGameStatus] = useState<"active" | "entries-closed" | "completed">("active")
  const [winner, setWinner] = useState<{ username: string; number: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdownTime, setCountdownTime] = useState(10)
  const [showCharacter, setShowCharacter] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingNumber, setPendingNumber] = useState<number | null>(null)
  const [userConfirmedNumber, setUserConfirmedNumber] = useState<number | null>(null)
  const [confirmError, setConfirmError] = useState("")

  useEffect(() => {
    const storedUser = localStorage.getItem("telegramUser")
    if (!storedUser) {
      router.push("/")
      return
    }
    const user = JSON.parse(storedUser)
    setTelegramUser(user)

    const adminSession = localStorage.getItem("adminSession")
    setIsAdmin(!!adminSession)

    const paramSessionId = searchParams.get("session")
    if (!paramSessionId) {
      router.push("/")
      return
    }

    setSessionId(paramSessionId)
    setLoading(false)
  }, [router, searchParams])

  useEffect(() => {
    if (!sessionId || !telegramUser) return

    const fetchGameState = async () => {
      try {
        const response = await fetch(`/api/game?action=get&sessionId=${sessionId}`)
        if (!response.ok) {
          console.error("[v0] Session not found, redirecting to home")
          router.push("/")
          return
        }
        const data = await response.json()
        setSessionData({
          numbers: data.numbers || {},
          startTime: Date.now(),
        })
        setGameStatus(data.status)

        const userSelection = Object.entries(data.numbers || {}).find(
          ([_, selection]: [string, any]) => selection && selection.userId === telegramUser.id,
        )
        if (userSelection) {
          const [number] = userSelection
          setSelectedNumber(Number.parseInt(number))
          setUserConfirmedNumber(Number.parseInt(number))
        }

        if (data.status === "completed") {
          setWinner({
            username: data.winner,
            number: data.winnerNumber,
          })
        }
      } catch (error) {
        console.error("Error fetching game state:", error)
      }
    }

    fetchGameState()
  }, [sessionId, telegramUser, router])

  useEffect(() => {
    if (gameStatus !== "entries-closed") return

    const timer = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setShowCharacter(true)
          setTimeout(() => {
            selectRandomWinner()
          }, 3000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus])

  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/game?action=get&sessionId=${sessionId}`, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
        })
        if (!response.ok) return

        const data = await response.json()
        setSessionData({
          numbers: data.numbers,
          startTime: Date.now(),
        })

        if (data.status !== gameStatus) {
          setGameStatus(data.status)
          setCountdownTime(10)
          setShowCharacter(false)

          if (data.status === "completed" && data.winner) {
            setWinner({
              username: data.winner,
              number: data.winnerNumber,
            })
          }
        }
      } catch (error) {
        console.error("Error polling game state:", error)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionId, gameStatus])

  const handleNumberSelect = useCallback(
    (number: number) => {
      if (!sessionData || gameStatus !== "active" || !telegramUser) return

      if (userConfirmedNumber !== null) {
        setConfirmError("You have already selected a number in this session. You cannot change it.")
        return
      }

      const selectedData = sessionData.numbers[number]
      const isAlreadySelected = selectedData && selectedData.username

      if (isAlreadySelected) {
        setConfirmError("Already selected - select another number")
        return
      }

      setConfirmError("")
      setPendingNumber(number)
      setShowConfirmDialog(true)
    },
    [sessionData, gameStatus, telegramUser, userConfirmedNumber],
  )

  const handleConfirmSelection = useCallback(async () => {
    if (!sessionData || !telegramUser || pendingNumber === null) return

    const userIdentifier = `${telegramUser.username || telegramUser.first_name}`
    const selectedData = sessionData.numbers[pendingNumber]
    const isAlreadySelected = selectedData && selectedData.username

    if (isAlreadySelected) {
      setConfirmError("This number was just selected by another player. Please choose another.")
      setPendingNumber(null)
      setShowConfirmDialog(false)
      return
    }

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "selectNumber",
          sessionId,
          number: pendingNumber,
          username: userIdentifier,
          userId: telegramUser.id, // Include user ID to track selections per user
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        setConfirmError(error.error || "Failed to select number")
        setPendingNumber(null)
        setShowConfirmDialog(false)
        return
      }

      setSelectedNumber(pendingNumber)
      setUserConfirmedNumber(pendingNumber)
      setShowConfirmDialog(false)
      setPendingNumber(null)
      setConfirmError("")

      // Fetch updated game state
      const gameResponse = await fetch(`/api/game?action=get&sessionId=${sessionId}`)
      if (gameResponse.ok) {
        const data = await gameResponse.json()
        setSessionData({
          numbers: data.numbers,
          startTime: Date.now(),
        })
      }
    } catch (error) {
      console.error("Error confirming selection:", error)
      setConfirmError("Failed to confirm selection")
    }
  }, [sessionData, telegramUser, pendingNumber, sessionId])

  const selectRandomWinner = useCallback(async () => {
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "selectWinner",
          sessionId,
        }),
      })

      if (!response.ok) return

      const data = await response.json()
      setGameStatus("completed")
      setWinner({ username: data.winner, number: data.winnerNumber })
    } catch (error) {
      console.error("Error selecting winner:", error)
    }
  }, [sessionId])

  const closeEntries = async () => {
    try {
      await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "closeEntries",
          sessionId,
        }),
      })
      setGameStatus("entries-closed")
      setCountdownTime(10)
    } catch (error) {
      console.error("Error closing entries:", error)
    }
  }

  const handleBackToHome = () => {
    localStorage.removeItem("telegramUser")
    router.push("/")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-lg">Loading game...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="fixed top-4 right-4 flex gap-2 z-50">
        {isAdmin && gameStatus === "active" && (
          <Button onClick={closeEntries} className="gap-2 bg-orange-600 hover:bg-orange-700" size="sm">
            <Lock size={16} />
            Close Entries
          </Button>
        )}
        <Button variant="outline" onClick={handleBackToHome} size="sm" className="gap-2 bg-transparent">
          <LogOut size={16} />
          Exit
        </Button>
      </div>

      <div className="max-w-6xl mx-auto pt-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Number Game</h1>
          {telegramUser && (
            <p className="text-muted-foreground text-sm">
              Player:{" "}
              <span className="font-semibold">
                {telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name}
              </span>
            </p>
          )}
          {gameStatus === "entries-closed" && (
            <p className="text-sm text-orange-600 font-semibold mt-1">
              Entries Closed - Winner will be selected soon...
            </p>
          )}
          {userConfirmedNumber !== null && gameStatus === "active" && (
            <p className="text-sm text-green-600 font-semibold mt-1">
              Your selection confirmed: Number {userConfirmedNumber}
            </p>
          )}
        </div>

        {gameStatus === "active" ? (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Select a Number (1-100)</h2>
            {confirmError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{confirmError}</div>}
            <GameBoard selectedNumber={selectedNumber} sessionData={sessionData} onNumberSelect={handleNumberSelect} />
          </Card>
        ) : gameStatus === "entries-closed" ? (
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">Game Board - All Selections</h2>
              <GameBoard selectedNumber={selectedNumber} sessionData={sessionData} onNumberSelect={() => {}} />
            </Card>

            <Card className="p-6 text-center bg-gradient-to-br from-purple-50 to-blue-50">
              {!showCharacter ? (
                <div className="space-y-4">
                  <p className="text-lg font-semibold">Selecting Winner In...</p>
                  <div className="text-5xl font-bold text-primary animate-pulse">{countdownTime}</div>
                </div>
              ) : (
                <GameCharacter winnerNumber={winner?.number || 0} />
              )}
            </Card>
          </div>
        ) : (
          <WinnerDisplay winner={winner} />
        )}
      </div>

      <SelectionConfirmDialog
        isOpen={showConfirmDialog}
        selectedNumber={pendingNumber}
        onConfirm={handleConfirmSelection}
        onCancel={() => {
          setShowConfirmDialog(false)
          setPendingNumber(null)
        }}
      />
    </main>
  )
}
