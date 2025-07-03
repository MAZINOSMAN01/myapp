import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'

/* --- UI --- */
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import { Plus, Trash2 } from 'lucide-react'

type AssetDoc = {
  id: string
  name: string
  location?: string
  types: string[]
}

export function AssetTracking() {
  /* --------------------------- state --------------------------- */
  const [assets, setAssets] = useState<AssetDoc[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // حقول النموذج
  const [assetName, setAssetName] = useState('')
  const [assetLocation, setAssetLocation] = useState('')
  const [assetType, setAssetType] = useState('')

  /* ------------------------ load assets ------------------------ */
  const loadAssets = async () => {
    const snap = await getDocs(collection(db, 'assets'))
    const list = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as any) }) as AssetDoc
    )
    setAssets(list)
  }

  useEffect(() => {
    loadAssets()
  }, [])

  /* -------------------- create / update asset ------------------ */
  const handleSaveAsset = async () => {
    const name = assetName.trim()
    const type = assetType.trim()
    if (!name || !type) {
      alert('Please enter system name and type.')
      return
    }

    // ابحث عن أصل بنفس الاسم
    const existing = assets.find(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    )

    try {
      if (existing) {
        // أصل موجود → إضافة نوع إن لم يكن موجوداً
        await updateDoc(doc(db, 'assets', existing.id), {
          types: arrayUnion(type),
        })
      } else {
        // أصل جديد
        await addDoc(collection(db, 'assets'), {
          name,
          location: assetLocation,
          types: [type],
        })
      }
      setIsOpen(false)
      setAssetName('')
      setAssetLocation('')
      setAssetType('')
      loadAssets()
    } catch (e) {
      console.error(e)
      alert('Error saving asset.')
    }
  }

  /* ---------------------- delete a whole asset ----------------- */
  const handleDeleteAsset = async (id: string, name: string) => {
    if (!window.confirm(`Delete asset ${name}?`)) return
    await deleteDoc(doc(db, 'assets', id))
    loadAssets()
  }

  /* --------------------------- UI ------------------------------ */
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Asset &amp; System Management</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add New Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add a New Asset or System</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">

              {/* اختيار أو كتابة اسم النظام */}
              <div>
                <Label>System Name</Label>
                <Select
                  value={assetName}
                  onValueChange={(v) => setAssetName(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.name}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* حقل نصي للسماح باسم جديد */}
                <Input
                  className="mt-2"
                  placeholder="Or enter new system name…"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                />
              </div>

              {/* location (اختياري) */}
              <div>
                <Label>Location (optional)</Label>
                <Input
                  placeholder="e.g., Rooftop"
                  value={assetLocation}
                  onChange={(e) => setAssetLocation(e.target.value)}
                />
              </div>

              {/* نوع الأصل */}
              <div>
                <Label>Type</Label>
                {/* إن كان الأصل معروفاً → اعرض أنواعه للاختيار */}
                {assetName &&
                  assets.find(
                    (a) => a.name.toLowerCase() === assetName.toLowerCase()
                  )?.types?.length > 0 && (
                    <Select
                      onValueChange={(v) => setAssetType(v)}
                      value={assetType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick existing type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {assets
                          .find(
                            (a) =>
                              a.name.toLowerCase() === assetName.toLowerCase()
                          )
                          ?.types.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                <Input
                  className="mt-2"
                  placeholder="Or enter new type…"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAsset}>Save Asset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* عرض الأصول */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) =>
          asset.types.map((tp) => (
            <Card key={asset.id + tp}>
              <CardHeader>
                <CardTitle>{asset.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{tp}</p>
              </CardHeader>
              <CardContent>
                {asset.location && (
                  <p className="text-xs text-gray-500">{asset.location}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
        {assets.length === 0 && (
          <p className="text-muted-foreground">No assets defined yet.</p>
        )}
      </div>
    </div>
  )
}
