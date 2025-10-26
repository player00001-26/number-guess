"use client"

import { Button } from "@/components/ui/button"

interface SessionData {
  numbers: Record<number, string>
}

interface GameBoardProps {
  selectedNumber: number | null
  sessionData: SessionData | null
  onNumberSelect: (number: number) => void
}

export default function GameBoard({ selectedNumber, sessionData, onNumberSelect }: GameBoardProps) {
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1)

  return (
    <div className="grid grid-cols-10 gap-1 sm:gap-2">
      {numbers.map((num) => {
        const selectedData = sessionData?.numbers[num]
        const selectedBy = selectedData?.username
        const isSelected = selectedNumber === num
        const isOtherUserSelected = selectedBy && selectedBy !== ""

        return (
          <Button
            key={num}
            onClick={() => onNumberSelect(num)}
            disabled={isOtherUserSelected && !isSelected}
            variant={isSelected ? "default" : "outline"}
            className={`h-10 sm:h-12 text-xs sm:text-sm font-semibold transition-all ${
              isOtherUserSelected && !isSelected ? "opacity-50 cursor-not-allowed" : ""
            } ${isOtherUserSelected && isSelected ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            title={selectedBy ? `Selected by ${selectedBy}` : "Available"}
          >
            <div className="flex flex-col items-center justify-center">
              <span>{num}</span>
              {isOtherUserSelected && (
                <span className="text-xs opacity-75 hidden sm:block">{selectedBy.substring(0, 3)}</span>
              )}
            </div>
          </Button>
        )
      })}
    </div>
  )
}
