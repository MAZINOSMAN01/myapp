import React, { useEffect, useState, useMemo } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
// 🔥 NEW: Added Wand2 icon for auto-generate button
import { Plus, Edit, Trash2, ChevronsUpDown, Wand2 } from 'lucide-react'

import type { SystemAsset, AssetType } from '@/types/maintenance'
import type { SpaceLocation } from '@/types/space-management'
import { EditAssetDialog } from '@/components/EditAssetDialog'

type Asset = SystemAsset

const Combobox = ({
  options,
  value,
  onSelect,
  placeholder,
}: {
  options: string[]
  value: string
  onSelect: (v: string) => void
  placeholder: string
}) => {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search or add…" onValueChange={onSelect} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={(val) => {
                    onSelect(val === value ? '' : val)
                    setOpen(false)
                  }}
                >
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function AssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [spaces, setSpaces] = useState<SpaceLocation[]>([])
  const [filterSystem, setFilterSystem] = useState('all')
  const [filterType, setFilterType] = useState('')
  const [filterLocation, setFilterLocation] = useState('all')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'editType' | 'addType'>('add')
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingType, setEditingType] = useState<AssetType | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ asset: Asset; type: AssetType } | null>(null)

  const [assetName, setAssetName] = useState('')
  const [assetType, setAssetType] = useState('')
  const [assetLocation, setAssetLocation] = useState('')
  const [assetLocationId, setAssetLocationId] = useState('')
  const [assetLabel, setAssetLabel] = useState('')
  const [assetQuantity, setAssetQuantity] = useState<number>(1)

  const { toast } = useToast()

  // 🔥 NEW: Auto-increment label generation function
  const generateNextLabel = () => {
    if (!assetType || !assetName) return ''
    
    // Find current asset or create new one
    const currentAsset = assets.find(a => a.name === assetName)
    if (!currentAsset) return `${assetType} 1`
    
    // Find all similar types in the system
    const similarTypes = currentAsset.types.filter(t => t.name === assetType)
    
    if (similarTypes.length === 0) return `${assetType} 1`
    
    // Extract numbers from existing labels
    const numbers = similarTypes
      .map(t => t.label || '')
      .map(label => {
        const match = label.match(/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      })
      .filter(num => num > 0)
    
    // Find max number and add 1
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
    return `${assetType} ${maxNumber + 1}`
  }

  // 🔥 NEW: Handle asset type change with auto-clear label
  const handleAssetTypeChange = (value: string) => {
    setAssetType(value)
    // Clear label when type changes to allow auto-generation
    setAssetLabel('')
  }

  // 🔥 NEW: Handle asset name change with auto-clear label
  const handleAssetNameChange = (value: string) => {
    setAssetName(value)
    // Clear label when system changes to allow auto-generation
    if (assetType) {
      setAssetLabel('')
    }
  }

  // 🔥 NEW: Auto-generate label when type changes
  useEffect(() => {
    if (assetType && assetName && !assetLabel) {
      const nextLabel = generateNextLabel()
      if (nextLabel) {
        setAssetLabel(nextLabel)
      }
    }
  }, [assetType, assetName, assets])

  const loadAssets = async () => {
    try {
      const snap = await getDocs(collection(db, 'assets'))
      const list = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name,
          location: data.location,
          spaceId: data.spaceId,
          types: (data.types || []) as AssetType[],
        } as Asset
      })
      setAssets(list)
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed loading assets.', variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadAssets()
    getDocs(collection(db, 'space_locations'))
      .then((snap) => {
        setSpaces(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SpaceLocation[])
      })
      .catch((e) => {
        console.error(e)
        toast({ title: 'Error', description: 'Failed loading spaces.', variant: 'destructive' })
      })
  }, [])

  const openAddAsset = () => {
    setDialogMode('add')
    setEditingAsset(null)
    setEditingType(null)
    setAssetName('')
    setAssetType('')
    setAssetLocation('')
    setAssetLocationId('')
    setAssetLabel('')
    setAssetQuantity(1)
    setIsDialogOpen(true)
  }

  const openEditType = (asset: Asset, t: AssetType) => {
    setDialogMode('editType')
    setEditingAsset(asset)
    setEditingType(t)
    setAssetName(asset.name)
    setAssetType(t.name)
    setAssetLocation(t.location ?? '')
    setAssetLocationId(t.spaceId ?? '')
    setAssetLabel(t.label ?? '')
    setAssetQuantity(t.quantity ?? 1)
    setIsDialogOpen(true)
  }

  const openAddType = (asset: Asset) => {
    setDialogMode('addType')
    setEditingAsset(asset)
    setEditingType(null)
    setAssetName(asset.name)
    setAssetType('')
    setAssetLocation('')
    setAssetLocationId('')
    setAssetLabel('')
    setAssetQuantity(1)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const name = assetName.trim()
    const type = assetType.trim()
    const location = assetLocation.trim()
    const spaceId = assetLocationId.trim()
    const label = assetLabel.trim()
    const quantity = assetQuantity

    if (!name || !type) {
      alert('System name and type are required.')
      return
    }

    try {
      if (dialogMode === 'editType' && editingAsset && editingType) {
        const newTypes = editingAsset.types.map((t) =>
          t.name === editingType.name ? { name: type, location, spaceId, label, quantity } : t,
        )
        await updateDoc(doc(db, 'assets', editingAsset.id), { name, types: newTypes })
        toast({ description: 'Type updated.' })
      }
      else if (dialogMode === 'addType' && editingAsset) {
        const dup = editingAsset.types.some((t) => t.name === type && t.location === location && t.label === label)
        if (dup) {
          alert('Type/location/label combination already exists.')
          return
        }
        await updateDoc(doc(db, 'assets', editingAsset.id), {
          types: [...editingAsset.types, { name: type, location, spaceId, label, quantity }],
        })
        toast({ description: 'Type added.' })
      }
      else {
        const existing = assets.find((a) => a.name === name)
        if (existing) {
          const dup = existing.types.some((t) => t.name === type && t.location === location && t.label === label)
          if (dup) {
            alert('Type/location/label combination already exists.')
            return
          }
          await updateDoc(doc(db, 'assets', existing.id), {
            types: [...existing.types, { name: type, location, spaceId, label, quantity }],
          })
          toast({ description: 'Type added to existing system.' })
        } else {
          await addDoc(collection(db, 'assets'), {
            name,
            types: [{ name: type, location, spaceId, label, quantity }]
          })
          toast({ description: 'New system created.' })
        }
      }

      setIsDialogOpen(false)
      loadAssets()
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Save failed.', variant: 'destructive' })
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    const { asset, type } = itemToDelete
    const ref = doc(db, 'assets', asset.id)

    try {
      if (asset.types.length === 1) {
        await deleteDoc(ref)
        toast({ description: 'System deleted.' })
      } else {
        const newTypes = asset.types.filter((t) => t.name !== type.name)
        await updateDoc(ref, { types: newTypes })
        toast({ description: 'Type removed.' })
      }
      loadAssets()
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Delete failed.', variant: 'destructive' })
    } finally {
      setItemToDelete(null)
    }
  }

  const displayed = useMemo(
    () =>
      assets
        .filter((a) => filterSystem === 'all' || a.name === filterSystem)
        .flatMap((a) => a.types.map((tp) => ({ ...a, singleType: tp })))
        .filter((a) => !filterType || a.singleType.name.toLowerCase().includes(filterType.toLowerCase()))
        .filter((a) => filterLocation === 'all' || a.singleType.location === filterLocation),
    [assets, filterSystem, filterType, filterLocation],
  )

  const systemOptions = useMemo(() => Array.from(new Set(assets.map((a) => a.name))), [assets])
  
  // 🔥 NEW: Type options for selected system - shows previously used types
  const typeOptions = useMemo(() => {
    if (!assetName) return []
    const currentAsset = assets.find(a => a.name === assetName)
    if (!currentAsset) return []
    
    // Get all unique types from selected system
    const uniqueTypes = Array.from(new Set(currentAsset.types.map(t => t.name)))
    return uniqueTypes
  }, [assets, assetName])
  
  const locationOptions = useMemo(() => {
    return Array.from(new Set(spaces.map((s) => s.displayName))).sort()
  }, [spaces])
  
  const locationFilterOptions = useMemo(() => {
    const locations = new Set(['all'])
    assets.forEach((a) => {
      a.types.forEach((t) => {
        if (t.location) locations.add(t.location)
      })
    })
    return Array.from(locations).sort()
  }, [assets])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Asset & System Management</h2>

        <div className="flex items-center gap-2">
          <Input
            className="w-[200px]"
            placeholder="Search by type…"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          />

          <Select value={filterSystem} onValueChange={setFilterSystem}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              {systemOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locationFilterOptions.filter(l => l !== 'all').map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={openAddAsset}>
          <Plus className="mr-2 h-4 w-4" /> Add New Asset
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'editType'
                ? 'Edit Asset Type'
                : dialogMode === 'addType'
                ? 'Add Type to System'
                : 'Add New Asset'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>System Name</Label>
              <Combobox
                options={systemOptions}
                value={assetName}
                onSelect={handleAssetNameChange}
                placeholder="Select or add a system…"
              />
            </div>

            <div>
              <Label>Type</Label>
              {/* 🔥 NEW: Changed to Combobox with type suggestions */}
              <Combobox
                options={typeOptions}
                value={assetType}
                onSelect={handleAssetTypeChange}
                placeholder="Select or add a type…"
              />
            </div>

            <div>
              <Label>Location (optional)</Label>
              <Combobox
                options={locationOptions}
                value={assetLocation}
                onSelect={(val) => {
                  setAssetLocation(val)
                  const found = spaces.find((s) => s.displayName === val)
                  setAssetLocationId(found ? found.id : '')
                }}
                placeholder="Select or add a location…"
              />
            </div>

            <div>
              <Label>Label (optional)</Label>
              {/* 🔥 NEW: Added wand button for auto-generation */}
              <div className="flex gap-2">
                <Input 
                  value={assetLabel} 
                  onChange={(e) => setAssetLabel(e.target.value)} 
                  placeholder="e.g., Switch 1, Switch 2, etc." 
                  className="flex-1"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setAssetLabel(generateNextLabel())}
                  disabled={!assetType || !assetName}
                  className="px-3"
                  title="Auto-generate next number"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input 
                type="number" 
                value={assetQuantity} 
                onChange={(e) => setAssetQuantity(parseInt(e.target.value) || 1)} 
                placeholder="Enter quantity" 
                min="1"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {displayed.length ? (
          displayed.map((a, i) => (
            <Card key={`${a.id}-${a.singleType.name}-${i}`}>
              <CardHeader className="flex justify-between items-start">
                <div>
                  <CardTitle>{a.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {a.singleType.name}
                    {a.singleType.label && ` - ${a.singleType.label}`}
                  </p>
                  {a.singleType.location && (
                    <p className="text-xs text-gray-500">📍 {a.singleType.location}</p>
                  )}
                  {a.singleType.quantity && (
                    <p className="text-xs text-blue-600">Qty: {a.singleType.quantity}</p>
                  )}
                </div>

                <div className="flex space-x-1">
                  <Button variant="outline" size="icon" onClick={() => openEditType(a, a.singleType)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => openAddType(a)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setItemToDelete({ asset: a, type: a.singleType })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <EditAssetDialog asset={a} />
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-muted-foreground">No assets found.</p>
        )}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => !o && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete{' '}
              <strong>
                {itemToDelete?.type.name}
                {itemToDelete?.type.location && ` (${itemToDelete.type.location})`}
              </strong>{' '}
              from&nbsp;
              <strong>{itemToDelete?.asset.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}