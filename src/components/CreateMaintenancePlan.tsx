// src/components/CreateMaintenancePlan.tsx

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets: { id: string, name: string }[];
}

export function CreateMaintenancePlan({ isOpen, onClose, assets }: Props) {
  const [planName, setPlanName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [frequency, setFrequency] = useState('');
  const { toast } = useToast();

  const handleSavePlan = async () => {
    if (!planName || !taskDescription || !selectedAsset || !frequency) {
      toast({ title: "Error", description: "Please fill out all fields to create a plan.", variant: "destructive" });
      return;
    }

    try {
      await addDoc(collection(db, 'maintenance_plans'), {
        planName,
        taskDescription,
        assetId: selectedAsset,
        frequency,
        isActive: true,
        lastGenerated: new Date(0)
      });
      toast({ title: "Success", description: "Preventive maintenance plan created successfully." });
      onClose();
    } catch (error) {
      console.error("Error creating maintenance plan:", error);
      toast({ title: "Error", description: "Failed to create maintenance plan.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Preventive Maintenance Plan</DialogTitle>
          <DialogDescription>
            Define recurring tasks that are performed regularly to maintain assets.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g., Monthly HVAC Inspection" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset">Asset or System</Label>
            <Select onValueChange={setSelectedAsset} value={selectedAsset}>
              <SelectTrigger><SelectValue placeholder="Select an asset..." /></SelectTrigger>
              <SelectContent>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Task Description</Label>
            <Input id="task-description" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="e.g., Check filters, inspect for leaks" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select onValueChange={setFrequency} value={frequency}>
              <SelectTrigger><SelectValue placeholder="Select frequency..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
                <SelectItem value="Annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSavePlan}>Save Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}