"use client"

import { useEffect, useState } from "react"

interface GameCharacterProps {
  winnerNumber: number
}

export default function GameCharacter({ winnerNumber }: GameCharacterProps) {
  const [position, setPosition] = useState(0)
  const [isMoving, setIsMoving] = useState(true)

  useEffect(() => {
    if (!isMoving) return

    const interval = setInterval(() => {
      setPosition((prev) => {
        if (prev >= 90) {
          setIsMoving(false)
          return 90
        }
        return prev + 5
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isMoving])

  return (
    <div className="space-y-6">
      <div className="text-6xl animate-bounce">🎮</div>
      <div className="relative h-20 bg-white rounded-lg border-2 border-purple-300 overflow-hidden">
        <div
          className="absolute top-1/2 transform -translate-y-1/2 text-4xl transition-all duration-100"
          style={{ left: `${position}%` }}
        >
          🎮
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-purple-600">Character is selecting the winner...</p>
        <p className="text-sm text-muted-foreground mt-2">Target Number: {winnerNumber}</p>
      </div>
    </div>
  )
}
