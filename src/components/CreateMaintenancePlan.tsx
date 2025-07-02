import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import type { MaintenancePlan as PlanProps } from './PreventiveMaintenance';

interface Asset {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onPlanCreated: (plan: any) => void;
  editingPlan?: PlanProps | null;
}

export function CreateMaintenancePlan({
  isOpen,
  onClose,
  assets,
  onPlanCreated,
  editingPlan,
}: Props) {
  const [planName, setPlanName] = useState('');
  const [tasks, setTasks] = useState<string[]>(['']);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const { toast } = useToast();

  /* تعبئة النموذج عند التحرير */
  useEffect(() => {
    if (editingPlan) {
      setPlanName(editingPlan.planName);
      setTasks(editingPlan.tasks || ['']);
      setSelectedAsset(editingPlan.assetId);
      setFrequency(editingPlan.frequency);
      setStartDate(
        editingPlan.startDate?.seconds
          ? new Date(editingPlan.startDate.seconds * 1000)
              .toISOString()
              .split('T')[0]
          : '',
      );
    } else {
      resetForm();
    }
  }, [editingPlan, isOpen]);

  /* أدوات مساعدة */
  const handleTaskChange = (i: number, v: string) =>
    setTasks((t) => t.map((e, idx) => (idx === i ? v : e)));
  const addTask = () => setTasks((t) => [...t, '']);
  const removeTask = (i: number) =>
    setTasks((t) => (t.length > 1 ? t.filter((_, idx) => idx !== i) : t));

  const resetForm = () => {
    setPlanName('');
    setTasks(['']);
    setSelectedAsset('');
    setFrequency('');
    setStartDate('');
  };

  /*───────────────────────────────
   *     حفظ أو تحديث الخطة
   *───────────────────────────────*/
  const handleSavePlan = async () => {
    const validTasks = tasks.map((t) => t.trim()).filter(Boolean);
    if (!planName || !selectedAsset || !frequency || !startDate || !validTasks.length) {
      toast({
        title: 'Error',
        description: 'Please fill all fields, including start date and at least one task.',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      planName,
      tasks: validTasks,
      assetId: selectedAsset,
      frequency,
      startDate: Timestamp.fromDate(new Date(startDate)),
      isActive: true,
    };

    try {
      if (editingPlan) {
        /*──────── تحديث ────────*/
        await updateDoc(doc(db, 'maintenance_plans', editingPlan.id), data);

        /* توليد مهام جديدة فقط للبنود المُضافة لاحقًا */
        const newlyAdded = validTasks.filter((t) => !(editingPlan.tasks || []).includes(t));
        if (newlyAdded.length) {
          onPlanCreated({ id: editingPlan.id, ...data, tasks: newlyAdded });
        }

        toast({ title: 'Success', description: 'Plan updated successfully.' });
      } else {
        /*──────── إنشاء جديد ────────*/
        const ref = await addDoc(collection(db, 'maintenance_plans'), data);
        toast({ title: 'Success', description: 'Plan created successfully.' });
        onPlanCreated({ id: ref.id, ...data });
      }

      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: `Failed to ${editingPlan ? 'update' : 'create'} plan.`,
        variant: 'destructive',
      });
    }
  };

  /*───────────────────────────────
   *             UI
   *───────────────────────────────*/
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingPlan ? 'Edit' : 'Create New'} PM Plan</DialogTitle>
          <DialogDescription>
            {editingPlan
              ? 'Update the details of this recurring plan.'
              : 'Define a recurring plan with a checklist of tasks. The system will schedule all tasks for one year.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
          {/* اسم الخطة */}
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>

          {/* الأصل */}
          <div className="space-y-2">
            <Label htmlFor="asset">Asset / System</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Select an asset…" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* قائمة المهام */}
          <div className="space-y-2">
            <Label>Task Checklist</Label>
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t}
                  placeholder={`Task #${i + 1}`}
                  onChange={(e) => handleTaskChange(i, e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeTask(i)}
                  disabled={tasks.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addTask} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Another Task
            </Button>
          </div>

          {/* التكرار وتاريخ البداية */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Semi-annually">Semi-annually</SelectItem>
                  <SelectItem value="Annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">First Task Due Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSavePlan}>
            {editingPlan ? 'Update Plan' : 'Save Plan & Generate Tasks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
