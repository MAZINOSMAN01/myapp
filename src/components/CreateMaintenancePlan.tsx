import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';

// تحديث interfaces لتتوافق مع الهيكل الجديد
interface AssetType {
  name: string;
  location?: string;
}

interface Asset {
  id: string;
  name: string;
  types: AssetType[];
}

interface User {
  id: string;
  name: string;
}

type Frequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-annually' | 'Annually';

interface NewMaintenancePlan {
  assetId: string;
  planName: string;
  frequency: Frequency;
  firstDueDate: Timestamp;
  tasks: string[];
  assignedTo?: string;
}

interface MaintenancePlan extends NewMaintenancePlan {
  id: string;
}

export interface CreateMaintenancePlanProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  users?: User[];
  onPlanCreated: (plan: NewMaintenancePlan) => Promise<void>;
  editingPlan?: MaintenancePlan;
}

export function CreateMaintenancePlan({
  isOpen,
  onClose,
  assets,
  users,
  onPlanCreated,
  editingPlan,
}: CreateMaintenancePlanProps) {
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [planName, setPlanName] = useState<string>('');
  const [frequency, setFrequency] = useState<Frequency>('Weekly');
  const [firstDue, setFirstDue] = useState<string>('');
  const [tasks, setTasks] = useState<string[]>(['']);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const { toast } = useToast();

  // دالة لإنشاء اسم عرض الأصل
  const getAssetDisplayName = (asset: Asset): string => {
    // العثور على النوع الأول الذي له موقع
    const typeWithLocation = asset.types.find(type => type.location && type.location.trim());
    
    if (typeWithLocation?.location) {
      return `${asset.name} - ${typeWithLocation.location}`;
    }
    
    return asset.name;
  };

  // تجميع الأنظمة (إزالة التكرار)
  const availableSystems = useMemo(() => {
    const systemsSet = new Set<string>();
    assets.forEach(asset => {
      if (asset.name && typeof asset.name === 'string' && asset.name.trim()) {
        systemsSet.add(asset.name.trim());
      }
    });
    return Array.from(systemsSet).sort();
  }, [assets]);

  // الأنواع المتاحة للنظام المختار
  const availableTypes = useMemo(() => {
    if (!selectedSystem) return [];
    const typesSet = new Set<string>();
    assets.forEach(asset => {
      if (asset.name === selectedSystem) {
        asset.types.forEach(type => {
          if (type.name && type.name.trim()) {
            typesSet.add(type.name.trim());
          }
        });
      }
    });
    return Array.from(typesSet).sort();
  }, [selectedSystem, assets]);

  // الأصول المتاحة للنظام والنوع المختار
  const availableAssets = useMemo(() => {
    if (!selectedSystem || !selectedType) return [];
    return assets.filter(asset => 
      asset.name === selectedSystem && 
      asset.types.some(type => type.name === selectedType)
    );
  }, [selectedSystem, selectedType, assets]);

  const resetForm = useCallback(() => {
    setSelectedSystem('');
    setSelectedType('');
    setAssetId('');
    setPlanName('');
    setFrequency('Weekly');
    setFirstDue('');
    setTasks(['']);
    setAssignedTo('');
  }, []);

  useEffect(() => {
    if (editingPlan) {
      const relatedAsset = assets.find(a => a.id === editingPlan.assetId);
      if (relatedAsset) {
        setSelectedSystem(relatedAsset.name);
        // العثور على النوع المناسب
        const matchingType = relatedAsset.types.find(type => type.name === editingPlan.planName);
        if (matchingType) {
          setSelectedType(matchingType.name);
        }
        setAssetId(editingPlan.assetId);
      }
      setPlanName(editingPlan.planName);
      setFrequency(editingPlan.frequency);
      setFirstDue(editingPlan.firstDueDate.toDate().toISOString().substring(0, 10));
      setTasks([...editingPlan.tasks]);
      setAssignedTo(editingPlan.assignedTo || '');
    } else {
      resetForm();
    }
  }, [editingPlan, assets, resetForm]);

  useEffect(() => {
    if (selectedSystem && !editingPlan) {
      setSelectedType('');
      setAssetId('');
      setPlanName('');
    }
  }, [selectedSystem, editingPlan]);

  useEffect(() => {
    if (selectedType && !editingPlan) {
      setAssetId('');
      setPlanName(selectedType);
    }
  }, [selectedType, editingPlan]);

  useEffect(() => {
    if (!editingPlan && selectedType) {
      setPlanName(selectedType);
    }
  }, [selectedType, editingPlan]);

  const handleSave = async () => {
    if (!selectedSystem || !selectedType || !assetId || !planName || !firstDue) {
      toast({
        title: 'Missing Information',
        description: 'Please fill all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const filteredTasks = tasks.filter(t => t.trim());
    if (filteredTasks.length === 0) {
      toast({
        title: 'No Tasks Added',
        description: 'Please add at least one task.',
        variant: 'destructive',
      });
      return;
    }

    const newPlan: NewMaintenancePlan = {
      assetId,
      planName,
      frequency,
      firstDueDate: Timestamp.fromDate(new Date(firstDue)),
      tasks: filteredTasks,
      assignedTo: assignedTo && assignedTo !== 'unassigned' ? assignedTo : undefined,
    };

    try {
      await onPlanCreated(newPlan);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Save Error',
        description: 'An error occurred while saving the plan.',
        variant: 'destructive',
      });
    }
  };

  const handleAddTask = () => setTasks([...tasks, '']);
  const handleRemoveTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };
  const handleTaskChange = (index: number, value: string) => {
    setTasks(currentTasks => currentTasks.map((t, i) => (i === index ? value : t)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? 'Edit Preventive Maintenance Plan' : 'Create New PM Plan'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* System Selection */}
          <div>
            <Label>System</Label>
            <Select value={selectedSystem} onValueChange={setSelectedSystem}>
              <SelectTrigger><SelectValue placeholder="Select a system..." /></SelectTrigger>
              <SelectContent>
                {availableSystems.map((system) => (
                  <SelectItem key={system} value={system}>{system}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Selection */}
          {selectedSystem && (
            <div>
              <Label>Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location Selection */}
          {selectedSystem && selectedType && (
            <div>
              <Label>Location</Label>
              <Select value={assetId} onValueChange={setAssetId}>
                <SelectTrigger><SelectValue placeholder="Select a location..." /></SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {getAssetDisplayName(asset)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assigned To Selection */}
          <div>
            <Label>Assigned To (Optional)</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users?.filter(u => u.name).map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency and First Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    { value: 'Daily', label: 'Daily' },
                    { value: 'Weekly', label: 'Weekly' },
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Quarterly', label: 'Quarterly' },
                    { value: 'Semi-annually', label: 'Semi-annually' },
                    { value: 'Annually', label: 'Annually' }
                  ].map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>First Due Date</Label>
              <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
            </div>
          </div>

          {/* Task Checklist */}
          <div className="space-y-2">
            <Label>Task Checklist</Label>
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  placeholder={`Task #${index + 1}`}
                  value={task}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  className="flex-1"
                />
                {tasks.length > 1 && (
                  <Button variant="destructive" size="icon" onClick={() => handleRemoveTask(index)} type="button">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddTask} type="button">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Another Task
            </Button>
          </div>
        </div>
        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}