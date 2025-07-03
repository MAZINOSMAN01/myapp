// src/components/TaskDialog.tsx
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { CheckCircle2, XCircle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  task: any | null
  assetName?: string
  planName?: string
}

export function TaskDialog({
  open,
  onClose,
  task,
  assetName,
  planName,
}: Props) {
  const [isSaving, setIsSaving] = useState(false)

  if (!task) return null

  const updateStatus = async (status: 'Completed' | 'Skipped') => {
    setIsSaving(true)
    try {
      await updateDoc(doc(db, 'maintenance_tasks', task.id), { status })
      onClose() // يغلق الحوار بعد النجاح
    } catch (e) {
      console.error('Status update failed', e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.taskDescription}
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Plan:</span> {planName ?? '—'}
              </p>
              <p>
                <span className="font-medium">System:</span> {assetName ?? '—'}
              </p>
              <p>
                <span className="font-medium">Due Date:</span>{' '}
                {task.dueDate.toDate().toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Status:</span> {task.status}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            disabled={isSaving}
            variant="outline"
            onClick={() => updateStatus('Skipped')}
          >
            <XCircle className="mr-1 h-4 w-4" /> Mark Skipped
          </Button>
          <Button
            disabled={isSaving}
            onClick={() => updateStatus('Completed')}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Mark Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
