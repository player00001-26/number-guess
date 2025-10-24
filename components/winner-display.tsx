"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy } from "lucide-react"

interface WinnerDisplayProps {
  winner: { username: string; number: number } | null
}

export default function WinnerDisplay({ winner }: WinnerDisplayProps) {
  const router = useRouter()

  return (
    <Card className="p-8 text-center bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300">
      <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
      <h2 className="text-3xl font-bold mb-2 text-primary">Game Over!</h2>
      {winner ? (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-6 border-2 border-yellow-300">
            <p className="text-lg text-muted-foreground mb-2">Winner</p>
            <p className="text-4xl font-bold text-primary mb-4">{winner.username}</p>
            <p className="text-xl text-muted-foreground">
              Winning Number: <span className="font-bold text-2xl text-primary">{winner.number}</span>
            </p>
          </div>
          <Button
            onClick={() => {
              localStorage.removeItem("playerUsername")
              router.push("/")
            }}
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      ) : (
        <p className="text-lg text-muted-foreground">No winner selected</p>
      )}
    </Card>
  )
}
