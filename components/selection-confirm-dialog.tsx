"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface SelectionConfirmDialogProps {
  isOpen: boolean
  selectedNumber: number | null
  onConfirm: () => void
  onCancel: () => void
}

export default function SelectionConfirmDialog({
  isOpen,
  selectedNumber,
  onConfirm,
  onCancel,
}: SelectionConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="p-6 max-w-sm w-full bg-white">
        <h3 className="text-xl font-bold mb-4 text-center">Confirm Your Selection</h3>
        <div className="bg-blue-50 rounded-lg p-6 mb-6 text-center">
          <p className="text-muted-foreground mb-2">You selected:</p>
          <p className="text-5xl font-bold text-primary">{selectedNumber}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          Once confirmed, you cannot change your selection. Are you sure?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-green-600 hover:bg-green-700">
            Confirm
          </Button>
        </div>
      </Card>
    </div>
  )
}
