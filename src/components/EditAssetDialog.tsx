// src/components/EditAssetDialog.tsx
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase/config'
import {
  doc,
  updateDoc,
  collection,
  getDocs,
} from 'firebase/firestore'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Asset } from '@/types/maintenance'
import type { SpaceLocation } from '@/types/space-management'
import { Pencil } from 'lucide-react'

interface Props {
  asset: Asset
}

export function EditAssetDialog({ asset }: Props) {
  const { toast } = useToast()
  const [locations, setLocations] = useState<SpaceLocation[]>([])
  const [selected, setSelected] = useState<string>(asset.spaceId ?? '')

  /** تحميل جميع المواقع من إدارة المساحات */
  useEffect(() => {
    getDocs(collection(db, 'space_locations'))
      .then((snap) => {
        setLocations(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SpaceLocation[]
        )
      })
      .catch((err) => {
        console.error(err)
        toast({ title: 'Error', description: 'Failed loading spaces.', variant: 'destructive' })
      })
  }, [])

  const handleSave = async () => {
    const selectedSpace = locations.find((l) => l.id === selected)
    await updateDoc(doc(db, 'assets', asset.id), {
      location: selectedSpace?.displayName ?? '',
      spaceId: selected || undefined,
    })
    toast({
      description: 'Asset location updated.',
      variant: 'default',
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Asset Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleSave} className="w-full">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
