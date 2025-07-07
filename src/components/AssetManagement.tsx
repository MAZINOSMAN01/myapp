import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebase/config';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Edit, Trash2, ChevronsUpDown } from 'lucide-react';

// تحديث هيكل البيانات ليدعم مواقع منفصلة لكل نوع
export interface AssetType {
  name: string;
  location?: string;
}

export interface AssetDoc {
  id: string;
  name: string;
  types: AssetType[]; // تغيير من string[] إلى AssetType[]
}

// Helper Combobox component for a better UX
const Combobox = ({
  options,
  value,
  onSelect,
  placeholder,
}: {
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Search or add new..."
            onValueChange={(searchValue) => onSelect(searchValue)}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export function AssetManagement() {
  const [assets, setAssets] = useState<AssetDoc[]>([]);
  const [filterSystem, setFilterSystem] = useState<string>('all');
  const [filterType, setFilterType] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'editType' | 'addType'>('add');
  
  const [editingAsset, setEditingAsset] = useState<AssetDoc | null>(null);
  const [editingType, setEditingType] = useState<AssetType | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ asset: AssetDoc; type: AssetType } | null>(null);

  // Form Fields
  const [assetName, setAssetName] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetType, setAssetType] = useState('');

  const { toast } = useToast();

  const loadAssets = async () => {
    try {
      const snap = await getDocs(collection(db, 'assets'));
      const list = snap.docs.map(d => {
        const data = d.data();
        // التعامل مع البيانات القديمة والجديدة
        const types = data.types || [];
        const convertedTypes = types.map((type: any) => {
          // إذا كان النوع string (البيانات القديمة)، نحوله إلى AssetType
          if (typeof type === 'string') {
            return { name: type, location: data.location || '' };
          }
          // إذا كان النوع AssetType (البيانات الجديدة)، نعيده كما هو
          return type;
        });
        
        return {
          id: d.id,
          name: data.name,
          types: convertedTypes
        } as AssetDoc;
      });
      setAssets(list);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast({
        title: 'Error Loading Assets',
        description: 'Failed to load assets from database.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);
  
  // Dialog openers
  const openDialogForAdd = () => {
    setDialogMode('add');
    setEditingAsset(null);
    setEditingType(null);
    setAssetName('');
    setAssetLocation('');
    setAssetType('');
    setIsDialogOpen(true);
  };

  const openDialogForEditType = (asset: AssetDoc, typeToEdit: AssetType) => {
    setDialogMode('editType');
    setEditingAsset(asset);
    setEditingType(typeToEdit);
    setAssetName(asset.name);
    setAssetLocation(typeToEdit.location || '');
    setAssetType(typeToEdit.name);
    setIsDialogOpen(true);
  };
  
  const openDialogForAddType = (asset: AssetDoc) => {
    setDialogMode('addType');
    setEditingAsset(asset);
    setEditingType(null);
    setAssetName(asset.name);
    setAssetLocation('');
    setAssetType('');
    setIsDialogOpen(true);
  };

  const handleSaveAsset = async () => {
    const name = assetName.trim();
    const location = assetLocation.trim();
    const type = assetType.trim();

    if (!name || !type) {
      alert('Please provide both a system name and a type.');
      return;
    }

    try {
      // --- ⭐ EDIT TYPE LOGIC ---
      if (dialogMode === 'editType' && editingAsset && editingType) {
        const updatedTypes = editingAsset.types.map(t => 
          t.name === editingType.name 
            ? { name: type, location: location }
            : t
        );
        
        await updateDoc(doc(db, 'assets', editingAsset.id), {
          types: updatedTypes,
          name: name,
        });
        toast({ 
          title: "Type Updated", 
          description: `Type "${editingType.name}" was updated to "${type}" with location "${location}".` 
        });
      } 
      // --- ⭐ ADD NEW TYPE TO EXISTING ASSET LOGIC ---
      else if (dialogMode === 'addType' && editingAsset) {
        // التحقق من عدم وجود نوع بنفس الاسم والموقع
        const typeAndLocationExists = editingAsset.types.some(t => 
          t.name === type && t.location === location
        );
        if (typeAndLocationExists) {
          alert(`Type "${type}" with location "${location}" already exists for system "${editingAsset.name}".`);
          return;
        }

        const newType: AssetType = { name: type, location: location };
        const updatedTypes = [...editingAsset.types, newType];
        
        await updateDoc(doc(db, 'assets', editingAsset.id), {
          types: updatedTypes,
          name: name,
        });
        toast({ 
          title: "Type Added", 
          description: `New type "${type}" added to system "${editingAsset.name}" with location "${location}".` 
        });
      }
      // --- ⭐ ADD NEW ASSET LOGIC ---
      else {
        const existingAsset = assets.find(a => a.name === name);
        if (existingAsset) {
          // التحقق من عدم وجود نوع بنفس الاسم والموقع
          const typeAndLocationExists = existingAsset.types.some(t => 
            t.name === type && t.location === location
          );
          if (typeAndLocationExists) {
            alert(`Type "${type}" with location "${location}" already exists for system "${name}".`);
            return;
          }

          const newType: AssetType = { name: type, location: location };
          const updatedTypes = [...existingAsset.types, newType];
          
          await updateDoc(doc(db, 'assets', existingAsset.id), {
            types: updatedTypes,
          });
          toast({ 
            title: "Type Added", 
            description: `New type "${type}" added to existing system "${name}" with location "${location}".` 
          });
        } else {
          const newType: AssetType = { name: type, location: location };
          await addDoc(collection(db, 'assets'), {
            name,
            types: [newType],
          });
          toast({ 
            title: "Asset Created", 
            description: `New system "${name}" was created with type "${type}" and location "${location}".` 
          });
        }
      }
      
      setIsDialogOpen(false);
      loadAssets();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error Saving Asset',
        description: 'An error occurred while saving the asset.',
        variant: 'destructive',
      });
    }
  };

  const promptDeleteAssetType = (asset: AssetDoc, type: AssetType) => {
    setItemToDelete({ asset, type });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { asset, type } = itemToDelete;
    const assetRef = doc(db, 'assets', asset.id);

    try {
      if (asset.types.length === 1 && asset.types[0].name === type.name) {
        // حذف النظام بالكامل إذا كان النوع الوحيد
        await deleteDoc(assetRef);
        toast({ 
          title: 'Asset Deleted', 
          description: `System "${asset.name}" was deleted.` 
        });
      } else {
        // حذف النوع المحدد فقط
        const updatedTypes = asset.types.filter(t => t.name !== type.name);
        await updateDoc(assetRef, { types: updatedTypes });
        toast({ 
          title: 'Type Deleted', 
          description: `Type "${type.name}" was removed from system "${asset.name}".` 
        });
      }
      loadAssets();
    } catch (e) {
      console.error(e);
      toast({ 
        title: 'Error Deleting', 
        description: 'An error occurred while deleting.',
        variant: 'destructive' 
      });
    } finally {
      setItemToDelete(null);
    }
  };

  // Memoized filtering logic
  const displayedAssets = useMemo(
    () =>
      assets
        .filter(a => filterSystem === 'all' || a.name === filterSystem)
        .flatMap(a => a.types.map(tp => ({ ...a, singleType: tp })))
        .filter(
          a =>
            filterType.trim() === '' ||
            a.singleType.name.toLowerCase().includes(filterType.trim().toLowerCase()),
        ),
    [assets, filterSystem, filterType],
  );

  const systemOptions = useMemo(() => Array.from(new Set(assets.map(a => a.name))), [assets]);
  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    assets.forEach(asset => {
      asset.types.forEach(type => {
        if (type.location && type.location.trim()) {
          locations.add(type.location);
        }
      });
    });
    return Array.from(locations);
  }, [assets]);

  const getDialogTitle = () => {
    switch(dialogMode){
        case 'editType': return 'Edit Asset Type';
        case 'addType': return 'Add New Type to System';
        case 'add': 
        default:
            return 'Add New Asset';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Asset &amp; System Management</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by type..."
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-[200px]"
          />
          <Select value={filterSystem} onValueChange={v => setFilterSystem(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              {systemOptions.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openDialogForAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add New Asset
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* System Name Combobox */}
            <div>
              <Label>System Name</Label>
              <Combobox
                options={systemOptions}
                value={assetName}
                onSelect={setAssetName}
                placeholder="Select or add a system..."
              />
            </div>
            
            {/* Type Input */}
            <div>
              <Label>Type</Label>
              <Input
                placeholder="Enter asset type..."
                value={assetType}
                onChange={e => setAssetType(e.target.value)}
              />
            </div>
            
            {/* Location Combobox - الآن مرتبط بالنوع وليس النظام */}
            <div>
              <Label>Location for this Type (optional)</Label>
              <Combobox
                options={locationOptions}
                value={assetLocation}
                onSelect={setAssetLocation}
                placeholder="Select or add a location..."
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAsset}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedAssets.length > 0 ? (
          displayedAssets.map((asset, index) => (
            <Card key={`${asset.id}-${asset.singleType.name}-${asset.singleType.location || 'no-location'}-${index}`}>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>{asset.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{asset.singleType.name}</p>
                  {asset.singleType.location && (
                    <p className="text-xs text-gray-500 mt-1">📍 {asset.singleType.location}</p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    title={`Edit "${asset.singleType.name}"`} 
                    onClick={() => openDialogForEditType(asset, asset.singleType)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    title={`Add new type to ${asset.name}`} 
                    onClick={() => openDialogForAddType(asset)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    title={`Delete "${asset.singleType.name}"`} 
                    onClick={() => promptDeleteAssetType(asset, asset.singleType)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground col-span-full">No assets defined yet.</p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={open => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the type <strong>"{itemToDelete?.type.name}"</strong> 
              {itemToDelete?.type.location && (
                <span> (Location: <strong>{itemToDelete.type.location}</strong>)</span>
              )}
              {' '}from the system <strong>"{itemToDelete?.asset.name}"</strong>. This action cannot be undone.
              <br/><br/>
              If this is the last type for the system, the entire system and all related data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}