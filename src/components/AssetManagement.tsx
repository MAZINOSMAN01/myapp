import React, { useEffect, useState, useMemo, useRef } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
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
// Icons for UI
import { Plus, Edit, Trash2, ChevronsUpDown, Wand2, Copy, Lightbulb } from 'lucide-react'

import type { SystemAsset, AssetType, AssetCondition, OperationalStatus } from '@/types/maintenance'
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
  const [filterCondition, setFilterCondition] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'editType' | 'addType' | 'bulk'>('add')
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingType, setEditingType] = useState<AssetType | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ asset: Asset; type: AssetType } | null>(null)

  const [assetName, setAssetName] = useState('')
  const [assetType, setAssetType] = useState('')
  const [assetLocation, setAssetLocation] = useState('')
  const [assetLocationId, setAssetLocationId] = useState('')
  const [assetLabel, setAssetLabel] = useState('')
  const [assetQuantity, setAssetQuantity] = useState<number>(1)
  const [bulkCount, setBulkCount] = useState<number>(5)
  const [bulkPrefix, setBulkPrefix] = useState('')
  const [bulkStartNumber, setBulkStartNumber] = useState<number>(1)
  
  // Enhanced asset fields
  const [assetCondition, setAssetCondition] = useState<AssetCondition>('Good')
  const [operationalStatus, setOperationalStatus] = useState<OperationalStatus>('Operational')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')

  const { toast } = useToast()
  const gridRef = useRef<HTMLDivElement>(null)

  // Function to scroll to newly added asset
  const scrollToNewAsset = () => {
    setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        })
      }
    }, 100) // Small delay to ensure DOM is updated
  }

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
          types: (data.types || []).map((type: any) => ({
            ...type,
            condition: type.condition || 'Good',
            operationalStatus: type.operationalStatus || 'Operational'
          })) as AssetType[],
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
    setBulkCount(5)
    setBulkPrefix('')
    setBulkStartNumber(1)
    // Reset enhanced fields
    setAssetCondition('Good')
    setOperationalStatus('Operational')
    setManufacturer('')
    setModel('')
    setSerialNumber('')
    setIsDialogOpen(true)
  }

  const openBulkAdd = () => {
    setDialogMode('bulk')
    setEditingAsset(null)
    setEditingType(null)
    setAssetName('')
    setAssetType('')
    setAssetLocation('')
    setAssetLocationId('')
    setAssetLabel('')
    setAssetQuantity(1)
    setBulkCount(5)
    setBulkPrefix('')
    setBulkStartNumber(1)
    // Reset enhanced fields
    setAssetCondition('Good')
    setOperationalStatus('Operational')
    setManufacturer('')
    setModel('')
    setSerialNumber('')
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
    // Set enhanced fields from existing type
    setAssetCondition(t.condition || 'Good')
    setOperationalStatus(t.operationalStatus || 'Operational')
    setManufacturer(t.manufacturer || '')
    setModel(t.model || '')
    setSerialNumber(t.serialNumber || '')
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
    // Reset enhanced fields for new type
    setAssetCondition('Good')
    setOperationalStatus('Operational')
    setManufacturer('')
    setModel('')
    setSerialNumber('')
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const name = assetName.trim()
    const type = assetType.trim()
    const location = assetLocation.trim()
    const spaceId = assetLocationId.trim()
    const label = assetLabel.trim()
    const quantity = assetQuantity
    
    // Enhanced fields
    const condition = assetCondition
    const opStatus = operationalStatus
    const manufacturerValue = manufacturer.trim()
    const modelValue = model.trim()
    const serialNumberValue = serialNumber.trim()

    if (!name || !type) {
      alert('System name and type are required.')
      return
    }

    try {
      if (dialogMode === 'editType' && editingAsset && editingType) {
        // Fix: Only update the specific type instance, not all types with same name
        const newTypes = editingAsset.types.map((t) => {
          // Match by name AND original label to target specific instance
          if (t.name === editingType.name && t.label === editingType.label && t.location === editingType.location) {
            return { 
              name: type, 
              location, 
              spaceId, 
              label, 
              quantity,
              condition,
              operationalStatus: opStatus,
              manufacturer: manufacturerValue,
              model: modelValue,
              serialNumber: serialNumberValue,
              updatedAt: Timestamp.now()
            }
          }
          return t
        })
        await updateDoc(doc(db, 'assets', editingAsset.id), { name, types: newTypes })
        toast({ description: 'Type updated.' })
        scrollToNewAsset()
      }
      else if (dialogMode === 'addType' && editingAsset) {
        const dup = editingAsset.types.some((t) => t.name === type && t.location === location && t.label === label)
        if (dup) {
          alert('Type/location/label combination already exists.')
          return
        }
        const newType = { 
          name: type, 
          location, 
          spaceId, 
          label, 
          quantity,
          condition,
          operationalStatus: operationalStatus,
          manufacturer: manufacturerValue,
          model: modelValue,
          serialNumber: serialNumberValue,
          createdAt: Timestamp.now()
        }
        await updateDoc(doc(db, 'assets', editingAsset.id), {
          types: [...editingAsset.types, newType],
        })
        toast({ description: 'Type added.' })
        scrollToNewAsset()
      }
      else if (dialogMode === 'bulk') {
        // Bulk creation logic
        const existing = assets.find((a) => a.name === name)
        const newTypes: AssetType[] = []
        
        for (let i = 0; i < bulkCount; i++) {
          const itemNumber = bulkStartNumber + i
          const itemLabel = bulkPrefix ? `${bulkPrefix} ${itemNumber}` : `${type} ${itemNumber}`
          
          // Check for duplicates
          const isDuplicate = existing?.types.some((t) => 
            t.name === type && t.location === location && t.label === itemLabel
          )
          
          if (!isDuplicate) {
            newTypes.push({ 
              name: type, 
              location, 
              spaceId, 
              label: itemLabel, 
              quantity: 1,
              condition,
              operationalStatus: opStatus,
              manufacturer: manufacturerValue,
              model: modelValue,
              serialNumber: serialNumberValue,
              createdAt: Timestamp.now()
            })
          }
        }
        
        if (newTypes.length === 0) {
          alert('All items already exist with those labels.')
          return
        }
        
        if (existing) {
          await updateDoc(doc(db, 'assets', existing.id), {
            types: [...existing.types, ...newTypes],
          })
        } else {
          await addDoc(collection(db, 'assets'), {
            name,
            types: newTypes
          })
        }
        
        toast({ description: `Created ${newTypes.length} items successfully.` })
        scrollToNewAsset()
      }
      else {
        const existing = assets.find((a) => a.name === name)
        if (existing) {
          const dup = existing.types.some((t) => t.name === type && t.location === location && t.label === label)
          if (dup) {
            alert('Type/location/label combination already exists.')
            return
          }
          const newType = { 
            name: type, 
            location, 
            spaceId, 
            label, 
            quantity,
            condition,
            operationalStatus: operationalStatus,
            manufacturer: manufacturerValue,
            model: modelValue,
            serialNumber: serialNumberValue,
            createdAt: Timestamp.now()
          }
          await updateDoc(doc(db, 'assets', existing.id), {
            types: [...existing.types, newType],
          })
          toast({ description: 'Type added to existing system.' })
          scrollToNewAsset()
        } else {
          const newType = { 
            name: type, 
            location, 
            spaceId, 
            label, 
            quantity,
            condition,
            operationalStatus: operationalStatus,
            manufacturer: manufacturerValue,
            model: modelValue,
            serialNumber: serialNumberValue,
            createdAt: Timestamp.now()
          }
          await addDoc(collection(db, 'assets'), {
            name,
            types: [newType]
          })
          toast({ description: 'New system created.' })
          scrollToNewAsset()
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
        const newTypes = asset.types.filter((t) => 
          !(t.name === type.name && 
            t.label === type.label && 
            t.location === type.location &&
            t.spaceId === type.spaceId)
        )
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
        .filter((a) => filterLocation === 'all' || a.singleType.location === filterLocation)
        .filter((a) => filterCondition === 'all' || a.singleType.condition === filterCondition)
        .filter((a) => filterStatus === 'all' || a.singleType.operationalStatus === filterStatus),
    [assets, filterSystem, filterType, filterLocation, filterCondition, filterStatus],
  )

  const systemOptions = useMemo(() => Array.from(new Set(assets.map((a) => a.name))), [assets])
  
  // Type options for selected system + common suggestions
  const typeOptions = useMemo(() => {
    const systemTypes = []
    if (assetName) {
      const currentAsset = assets.find(a => a.name === assetName)
      if (currentAsset) {
        systemTypes.push(...Array.from(new Set(currentAsset.types.map(t => t.name))))
      }
    }
    
    // Common type suggestions based on system name
    const commonTypes = {
      'Lighting': ['Switch', 'Fixture', 'Bulb', 'Dimmer', 'Motion Sensor', 'Emergency Light'],
      'HVAC': ['Unit', 'Filter', 'Vent', 'Thermostat', 'Duct', 'Fan'],
      'Electrical': ['Panel', 'Outlet', 'Breaker', 'Cable', 'Junction Box', 'Transformer'],
      'Fire Safety': ['Detector', 'Extinguisher', 'Alarm', 'Sprinkler', 'Exit Sign', 'Panel'],
      'Security': ['Camera', 'Card Reader', 'Sensor', 'Lock', 'Panel', 'Monitor'],
      'IT': ['Router', 'Switch', 'Server', 'UPS', 'Cable', 'Access Point']
    }
    
    const suggestions = Object.entries(commonTypes)
      .filter(([system]) => assetName?.toLowerCase().includes(system.toLowerCase()))
      .flatMap(([, types]) => types)
    
    return [...new Set([...systemTypes, ...suggestions])]
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
        <h2 className="text-2xl font-bold">Professional Asset Management</h2>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            className="w-[200px]"
            placeholder="Search by type…"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          />

          <Select value={filterSystem} onValueChange={setFilterSystem}>
            <SelectTrigger className="w-[140px]">
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
            <SelectTrigger className="w-[140px]">
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

          <Select value={filterCondition} onValueChange={setFilterCondition}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="Excellent">Excellent</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Fair">Fair</SelectItem>
              <SelectItem value="Poor">Poor</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Operational">Operational</SelectItem>
              <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
              <SelectItem value="Out of Service">Out of Service</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={openAddAsset}>
            <Plus className="mr-2 h-4 w-4" /> Add Asset
          </Button>
          <Button onClick={openBulkAdd} variant="outline">
            <Copy className="mr-2 h-4 w-4" /> Bulk Add
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'editType'
                ? 'Edit Asset Type'
                : dialogMode === 'addType'
                ? 'Add Type to System'
                : dialogMode === 'bulk'
                ? 'Bulk Add Assets'
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
              <Label className="flex items-center gap-1">
                Type
                {typeOptions.length > 0 && (
                  <Lightbulb className="h-3 w-3 text-yellow-500" />
                )}
              </Label>
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

            {dialogMode === 'bulk' ? (
              <>
                <div>
                  <Label>Count</Label>
                  <Input 
                    type="number" 
                    value={bulkCount} 
                    onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)} 
                    placeholder="How many items?" 
                    min="1"
                    max="50"
                  />
                </div>
                <div>
                  <Label>Label Prefix (optional)</Label>
                  <Input 
                    value={bulkPrefix} 
                    onChange={(e) => setBulkPrefix(e.target.value)} 
                    placeholder="e.g., Switch, Light, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use type name. Will create: {bulkPrefix || assetType} {bulkStartNumber}, {bulkPrefix || assetType} {bulkStartNumber + 1}, etc.
                  </p>
                </div>
                <div>
                  <Label>Start Number</Label>
                  <Input 
                    type="number" 
                    value={bulkStartNumber} 
                    onChange={(e) => setBulkStartNumber(parseInt(e.target.value) || 1)} 
                    placeholder="Starting number" 
                    min="1"
                  />
                </div>
              </>
            ) : (
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
            )}

            {/* Enhanced Professional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Condition</Label>
                <Select value={assetCondition} onValueChange={(value) => setAssetCondition(value as AssetCondition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Status</Label>
                <Select value={operationalStatus} onValueChange={(value) => setOperationalStatus(value as OperationalStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Out of Service">Out of Service</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Manufacturer (optional)</Label>
                <Input 
                  value={manufacturer} 
                  onChange={(e) => setManufacturer(e.target.value)} 
                  placeholder="e.g., Siemens, ABB"
                />
              </div>
              
              <div>
                <Label>Model (optional)</Label>
                <Input 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)} 
                  placeholder="Model number"
                />
              </div>
              
              <div>
                <Label>Serial # (optional)</Label>
                <Input 
                  value={serialNumber} 
                  onChange={(e) => setSerialNumber(e.target.value)} 
                  placeholder="Serial number"
                />
              </div>
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

      <div ref={gridRef} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  
                  {/* Enhanced Professional Information */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.singleType.condition && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        a.singleType.condition === 'Excellent' ? 'bg-green-100 text-green-800' :
                        a.singleType.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                        a.singleType.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                        a.singleType.condition === 'Poor' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {a.singleType.condition}
                      </span>
                    )}
                    
                    {a.singleType.operationalStatus && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        a.singleType.operationalStatus === 'Operational' ? 'bg-green-100 text-green-800' :
                        a.singleType.operationalStatus === 'Under Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        a.singleType.operationalStatus === 'Out of Service' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {a.singleType.operationalStatus}
                      </span>
                    )}
                  </div>
                  
                  {/* Technical Details */}
                  {(a.singleType.manufacturer || a.singleType.model || a.singleType.serialNumber) && (
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      {a.singleType.manufacturer && (
                        <p>🏭 {a.singleType.manufacturer}</p>
                      )}
                      {a.singleType.model && (
                        <p>📱 {a.singleType.model}</p>
                      )}
                      {a.singleType.serialNumber && (
                        <p>🔢 {a.singleType.serialNumber}</p>
                      )}
                    </div>
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