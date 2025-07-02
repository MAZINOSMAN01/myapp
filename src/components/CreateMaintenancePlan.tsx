// src/components/CreateMaintenancePlan.tsx

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';

interface Asset { id: string; name: string; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onPlanCreated: (plan: any) => void;
}

export function CreateMaintenancePlan({ isOpen, onClose, assets, onPlanCreated }: Props) {
  const [planName, setPlanName] = useState('');
  const [tasks, setTasks] = useState(['']);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const { toast } = useToast();

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const addTask = () => setTasks([...tasks, '']);

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const resetForm = () => {
    setPlanName('');
    setTasks(['']);
    setSelectedAsset('');
    setFrequency('');
    setStartDate('');
  };

  const handleSavePlan = async () => {
    const validTasks = tasks.map(t => t.trim()).filter(t => t !== '');
    if (!planName || validTasks.length === 0 || !selectedAsset || !frequency || !startDate) {
      toast({ title: "Error", description: "Please fill all fields, including start date and at least one task.", variant: "destructive" });
      return;
    }

    try {
      const planData = {
        planName,
        tasks: validTasks,
        assetId: selectedAsset,
        frequency,
        startDate: Timestamp.fromDate(new Date(startDate)),
        isActive: true,
      };
      
      const docRef = await addDoc(collection(db, 'maintenance_plans'), planData);
      toast({ title: "Success", description: "Preventive maintenance plan created successfully." });
      
      onPlanCreated({ id: docRef.id, ...planData });
      resetForm();
      onClose();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create maintenance plan.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Preventive Maintenance Plan</DialogTitle>
          <DialogDescription>
            Define a recurring plan with a checklist of tasks. The system will schedule all tasks for one year.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g., Weekly Generator Check" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset">Asset or System</Label>
            <Select onValueChange={setSelectedAsset} value={selectedAsset}>
              <SelectTrigger><SelectValue placeholder="Select an asset..." /></SelectTrigger>
              <SelectContent>{assets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Task Checklist</Label>
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={task} onChange={(e) => handleTaskChange(index, e.target.value)} placeholder={`Task #${index + 1}`}/>
                <Button variant="outline" size="icon" onClick={() => removeTask(index)} disabled={tasks.length === 1}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addTask} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Add Another Task</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select onValueChange={setFrequency} value={frequency}>
                <SelectTrigger><SelectValue placeholder="Select frequency..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">First Task Due Date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSavePlan}>Save Plan & Generate Tasks</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}