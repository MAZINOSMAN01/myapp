import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '@/firebase/config'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Plus, Edit, Trash2 } from 'lucide-react'

export interface AssetDoc {
  id: string
  name: string
  location?: string
  types: string[]
}

export function AssetManagement() {
  const [assets, setAssets] = useState<AssetDoc[]>([])
  const [filterSystem, setFilterSystem] = useState<string>('all')

  const [isOpen, setIsOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<AssetDoc | null>(null)

  // الحقول
  const [assetName, setAssetName] = useState('')
  const [assetLocation, setAssetLocation] = useState('')
  const [assetType, setAssetType] = useState('')

  // خاصية إظهار إدخال يدوي للاسم
  const [customName, setCustomName] = useState('')
  const [isCustomName, setIsCustomName] = useState(false)

  const loadAssets = async () => {
    const snap = await getDocs(collection(db, 'assets'))
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as AssetDoc))
    setAssets(list)
  }

  useEffect(() => {
    loadAssets()
  }, [])

  const openDialog = (asset?: AssetDoc) => {
    if (asset) {
      setEditingAsset(asset)
      setAssetName(asset.name)
      setCustomName('')
      setIsCustomName(false)
      setAssetLocation(asset.location ?? '')
      setAssetType('')
    } else {
      setEditingAsset(null)
      setAssetName('')
      setCustomName('')
      setIsCustomName(false)
      setAssetLocation('')
      setAssetType('')
    }
    setIsOpen(true)
  }

  const handleSaveAsset = async () => {
    const name = isCustomName ? customName.trim() : assetName.trim()
    const type = assetType.trim()
    if (!name || !type) {
      alert('Please enter both system name and type.')
      return
    }

    try {
      if (editingAsset) {
        await updateDoc(doc(db, 'assets', editingAsset.id), {
          name,
          location: assetLocation,
          types: arrayUnion(type),
        })
      } else {
        await addDoc(collection(db, 'assets'), {
          name,
          location: assetLocation,
          types: [type],
        })
      }
      setIsOpen(false)
      setEditingAsset(null)
      setAssetName('')
      setCustomName('')
      setIsCustomName(false)
      setAssetLocation('')
      setAssetType('')
      loadAssets()
    } catch (e) {
      console.error(e)
      alert('Error saving asset.')
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this asset and all its types?')) {
      return
    }
    try {
      await deleteDoc(doc(db, 'assets', id))
      loadAssets()
    } catch (e) {
      console.error(e)
      alert('Error deleting asset.')
    }
  }

  // فلترة الأصول
  const displayed = assets
    .filter(a => filterSystem === 'all' || a.name === filterSystem)
    .flatMap(a => a.types.map(tp => ({ ...a, singleType: tp })))

  const systemOptions = Array.from(new Set(assets.map(a => a.name)))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Asset &amp; System Management</h2>
        <Select
          value={filterSystem}
          onValueChange={v => setFilterSystem(v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Systems" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Systems</SelectItem>
            {systemOptions.map(name => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add New Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? 'Edit Asset' : 'Add a New Asset or System'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* System Name */}
              <div>
                <Label>System Name</Label>
                <Select
                  value={isCustomName ? "custom" : assetName}
                  onValueChange={v => {
                    if (v === "custom") {
                      setIsCustomName(true)
                      setAssetName('')
                    } else {
                      setIsCustomName(false)
                      setAssetName(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing…" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemOptions.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                    <SelectItem value="custom">Others...</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomName && (
                  <Input
                    className="mt-2"
                    placeholder="Enter new system name…"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                  />
                )}
              </div>
              <div>
                <Label>Location (optional)</Label>
                <Input
                  placeholder="e.g., Rooftop"
                  value={assetLocation}
                  onChange={e => setAssetLocation(e.target.value)}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Input
                  className="mt-2"
                  placeholder="Or enter new type…"
                  value={assetType}
                  onChange={e => setAssetType(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAsset}>
                {editingAsset ? 'Save Changes' : 'Save Asset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayed.length > 0 ? (
          displayed.map(asset => (
            <Card key={asset.id + asset.singleType}>
              <CardHeader className="flex justify-between items-start">
                <div>
                  <CardTitle>{asset.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {asset.singleType}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openDialog(asset)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteAsset(asset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {asset.location && (
                <CardContent>
                  <p className="text-xs text-gray-500">{asset.location}</p>
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground col-span-full">
            No assets defined yet.
          </p>
        )}
      </div>
    </div>
  )
}
