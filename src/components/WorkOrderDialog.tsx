// src/components/WorkOrderDialog.tsx
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { db } from '@/firebase/config'
import { collection, addDoc, Timestamp } from 'firebase/firestore'

type Slot = { start: Date; end: Date }
type Asset = { id: string; name: string }

type Props = {
  open: boolean
  onClose: () => void
  slot: Slot | null
  assets: Asset[]
}

export function WorkOrderDialog({ open, onClose, slot, assets }: Props) {
  const [assetId, setAssetId] = useState<string>('')
  const [description, setDescription] = useState('')

  if (!slot) return null

  const handleCreate = async () => {
    if (!assetId || !description.trim()) return
    try {
      await addDoc(collection(db, 'work_orders'), {
        assetId,
        description,
        status: 'Open',
        createdAt: Timestamp.now(),
        dueDate: Timestamp.fromDate(slot.start),
        type: 'Corrective', // أو ما يناسبك
      })
      onClose()
      setAssetId('')
      setDescription('')
    } catch (e) {
      console.error('Failed to create work order:', e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
          <DialogDescription>
            {slot.start.toDateString()} → {slot.end.toDateString()}
          </DialogDescription>
        </DialogHeader>

        {/* اختيار الأصل */}
        <div className="space-y-2">
          <label className="font-medium">System / Asset</label>
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
            <SelectContent>
              {assets.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* وصف المشكلة */}
        <div className="space-y-2 mt-4">
          <label className="font-medium">Description</label>
          <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
