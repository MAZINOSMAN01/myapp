import React, { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  location: string;
  type: string;
}

export function AssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetLocation, setNewAssetLocation] = useState('');
  const [newAssetType, setNewAssetType] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'assets'), (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetsData);
    });
    return () => unsubscribe();
  }, []);

  const handleAddAsset = async () => {
    if (!newAssetName || !newAssetLocation || !newAssetType) {
      toast({
        title: 'Error',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await addDoc(collection(db, 'assets'), {
        name: newAssetName,
        location: newAssetLocation,
        type: newAssetType,
      });
      toast({ title: 'Success', description: 'Asset added successfully.' });
      setNewAssetName('');
      setNewAssetLocation('');
      setNewAssetType('');
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error adding asset: ', error);
      toast({
        title: 'Error',
        description: 'Failed to add asset.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await deleteDoc(doc(db, 'assets', id));
      toast({ title: 'Success', description: 'Asset deleted.' });
    } catch (error) {
      console.error('Error deleting asset: ', error);
      toast({
        title: 'Error',
        description: 'Failed to delete asset.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Asset & System Management</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Asset or System</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} className="col-span-3" placeholder="e.g., HVAC-01" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Input id="type" value={newAssetType} onChange={(e) => setNewAssetType(e.target.value)} className="col-span-3" placeholder="e.g., HVAC Unit" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">Location</Label>
                <Input id="location" value={newAssetLocation} onChange={(e) => setNewAssetLocation(e.target.value)} className="col-span-3" placeholder="e.g., Rooftop - Building A" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button onClick={handleAddAsset}>Save Asset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <Card key={asset.id}>
            <CardHeader>
              <CardTitle>{asset.name}</CardTitle>
              <CardDescription>{asset.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{asset.location}</p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="destructive" size="icon" onClick={() => handleDeleteAsset(asset.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       {assets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No assets found. Click "Add New Asset" to get started.</p>
          </div>
        )}
    </div>
  );
}