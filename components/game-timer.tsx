"use client"

import { useEffect, useState } from "react"

interface SessionData {
  numbers: Record<number, string>
  startTime: number
}

interface GameTimerProps {
  onGameEnd: (winnerNumber: number) => void
  sessionData: SessionData | null
}

export default function GameTimer({ onGameEnd, sessionData }: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(60)
  const [gameEnded, setGameEnded] = useState(false)

  useEffect(() => {
    if (!sessionData || gameEnded) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setGameEnded(true)
          selectWinner()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionData, gameEnded])

  const selectWinner = () => {
    if (!sessionData) return

    const selectedNumbers = Object.keys(sessionData.numbers).map(Number)
    if (selectedNumbers.length === 0) return

    const randomIndex = Math.floor(Math.random() * selectedNumbers.length)
    const winnerNumber = selectedNumbers[randomIndex]
    onGameEnd(winnerNumber)
  }

  const progressPercentage = (timeLeft / 60) * 100

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Time Remaining</h3>
        <span className="text-3xl font-bold text-primary">{timeLeft}s</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {gameEnded ? "Game ended! Selecting winner..." : "Select your number before time runs out!"}
      </p>
    </div>
  )
}
