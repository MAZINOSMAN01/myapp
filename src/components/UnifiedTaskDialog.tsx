// src/components/UnifiedTaskDialog.tsx
// نظام موحد لجميع أنواع المهام - يحل مشكلة التكرار

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  Pause, 
  Save,
  Camera,
  FileText,
  DollarSign,
  Star
} from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useToast } from '@/components/ui/use-toast';

/* ═══════════════════════════════════════════════════════════════
 *                    TYPES & INTERFACES
 * ═══════════════════════════════════════════════════════════════ */

type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Skipped' | 'Cancelled';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
type TaskType = 'Preventive' | 'Corrective' | 'Cleaning' | 'Inspection';

interface BaseTask {
  id: string;
  taskDescription: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  dueDate: Timestamp;
  createdAt: Timestamp;
  lastModified: Timestamp;
  assignedTo?: string;
  planId?: string;
  assetId?: string;
  estimatedDuration?: number;
  timer?: {
    totalDuration: number;
    isPaused: boolean;
    pausedDuration: number;
  };
  notes?: string[];
  attachments?: string[];
  cost?: number;
  qualityRating?: number;
}

interface DialogConfig {
  mode: 'simple' | 'advanced' | 'quick';
  showTimer?: boolean;
  showCost?: boolean;
  showQuality?: boolean;
  showNotes?: boolean;
  showAttachments?: boolean;
  showStatusOnly?: boolean;
  isMobile?: boolean;
}

interface UnifiedTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: BaseTask | null;
  config?: DialogConfig;
  assetName?: string;
  planName?: string;
  onTaskUpdated?: (taskId: string, updates: Partial<BaseTask>) => void;
}

/* ═══════════════════════════════════════════════════════════════
 *                    MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════ */

export function UnifiedTaskDialog({
  isOpen,
  onClose,
  task,
  config = { mode: 'simple' },
  assetName,
  planName,
  onTaskUpdated,
}: UnifiedTaskDialogProps) {
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setCurrentStatus(task.status);
      setNotes(task.notes?.join('\n') || '');
      setCost(task.cost || 0);
      setQualityRating(task.qualityRating || 0);
      setTimerRunning(task.timer?.isPaused === false);
    }
  }, [task]);

  if (!task) return null;

  /* ═══════════════════════════════════════════════════════════════
   *                    EVENT HANDLERS
   * ═══════════════════════════════════════════════════════════════ */

  const handleStatusUpdate = async (newStatus: TaskStatus) => {
    if (!task) return;
    
    setIsLoading(true);
    try {
      const updates: Partial<BaseTask> = {
        status: newStatus,
        lastModified: Timestamp.now(),
      };

      // إضافة ملاحظة تلقائية عند التحديث
      if (notes.trim()) {
        updates.notes = [...(task.notes || []), `${new Date().toLocaleString()}: ${notes.trim()}`];
      }

      await updateDoc(doc(db, 'maintenance_tasks', task.id), updates);
      
      onTaskUpdated?.(task.id, updates);
      onClose();
      
      toast({
        title: 'Task Updated ✅',
        description: `Task marked as ${newStatus.toLowerCase()}.`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update task status.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvancedSave = async () => {
    if (!task) return;
    
    setIsLoading(true);
    try {
      const updates: Partial<BaseTask> = {
        status: currentStatus,
        lastModified: Timestamp.now(),
      };

      if (config.showCost && cost > 0) updates.cost = cost;
      if (config.showQuality && qualityRating > 0) updates.qualityRating = qualityRating;
      if (notes.trim()) updates.notes = [...(task.notes || []), notes.trim()];

      await updateDoc(doc(db, 'maintenance_tasks', task.id), updates);
      
      onTaskUpdated?.(task.id, updates);
      onClose();
      
      toast({
        title: 'Task Saved ✅',
        description: 'All changes have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save task changes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTimer = () => {
    // Logic for timer control will be implemented
    setTimerRunning(!timerRunning);
    toast({
      title: timerRunning ? 'Timer Paused' : 'Timer Started',
      description: `Task timer has been ${timerRunning ? 'paused' : 'started'}.`,
    });
  };

  /* ═══════════════════════════════════════════════════════════════
   *                    RENDER COMPONENTS
   * ═══════════════════════════════════════════════════════════════ */

  const TaskInfoSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Task Description</Label>
          <p className="mt-1 p-2 border rounded-md bg-gray-50 text-sm">
            {task.taskDescription}
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Status</Label>
          <div className="flex items-center gap-2">
            <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>
              {task.status}
            </Badge>
            <Badge variant="outline">{task.priority}</Badge>
          </div>
        </div>
      </div>

      {(planName || assetName) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planName && (
            <div>
              <Label className="text-sm font-medium">Plan</Label>
              <p className="text-sm text-gray-600">{planName}</p>
            </div>
          )}
          {assetName && (
            <div>
              <Label className="text-sm font-medium">Asset/System</Label>
              <p className="text-sm text-gray-600">{assetName}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">Due Date</Label>
          <p className="text-sm text-gray-600">
            {task.dueDate.toDate().toLocaleDateString()}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Type</Label>
          <p className="text-sm text-gray-600">{task.type}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Duration</Label>
          <p className="text-sm text-gray-600">
            {task.timer ? `${Math.floor(task.timer.totalDuration / 60)}h ${task.timer.totalDuration % 60}m` : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );

  const SimpleActions = () => (
    <div className="flex gap-2 justify-end">
      <Button
        variant="outline"
        onClick={() => handleStatusUpdate('Skipped')}
        disabled={isLoading}
      >
        <XCircle className="h-4 w-4 mr-2" />
        Skip
      </Button>
      <Button
        onClick={() => handleStatusUpdate('Completed')}
        disabled={isLoading}
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Complete
      </Button>
    </div>
  );

  const AdvancedTabs = () => (
    <Tabs defaultValue="status" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="status">Status</TabsTrigger>
        <TabsTrigger value="timer">Timer</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="quality">Quality</TabsTrigger>
      </TabsList>

      <TabsContent value="status" className="space-y-4">
        <div>
          <Label className="text-base font-medium">Update Status</Label>
          <RadioGroup value={currentStatus} onValueChange={(value) => setCurrentStatus(value as TaskStatus)}>
            {(['Pending', 'In Progress', 'Completed', 'Skipped'] as TaskStatus[]).map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <RadioGroupItem value={status} id={status} />
                <Label htmlFor={status}>{status}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </TabsContent>

      <TabsContent value="timer" className="space-y-4">
        {config.showTimer && (
          <div className="text-center space-y-4">
            <div className="text-3xl font-mono">
              {task.timer ? `${Math.floor(task.timer.totalDuration / 60)}:${(task.timer.totalDuration % 60).toString().padStart(2, '0')}` : '00:00'}
            </div>
            <Button onClick={toggleTimer} variant={timerRunning ? 'destructive' : 'default'}>
              {timerRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {timerRunning ? 'Pause' : 'Start'} Timer
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="notes" className="space-y-4">
        {config.showNotes && (
          <div>
            <Label htmlFor="notes">Add Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about this task..."
              className="min-h-[100px]"
            />
            {task.notes && task.notes.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Previous Notes</Label>
                <div className="mt-2 space-y-2">
                  {task.notes.map((note, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="quality" className="space-y-4">
        {config.showQuality && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="quality">Quality Rating (1-5)</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={qualityRating >= rating ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQualityRating(rating)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                ))}
                <span className="ml-2 text-sm text-gray-600">({qualityRating}/5)</span>
              </div>
            </div>
            {config.showCost && (
              <div>
                <Label htmlFor="cost">Cost (SAR)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <Input
                    id="cost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  /* ═══════════════════════════════════════════════════════════════
   *                    RENDER LOGIC
   * ═══════════════════════════════════════════════════════════════ */

  // للأجهزة المحمولة أو النمط السريع
  if (config.isMobile || config.mode === 'quick') {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{task.taskDescription}</DrawerTitle>
            <DrawerDescription>
              Quick task update for {assetName || 'maintenance task'}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 pb-4">
            <TaskInfoSection />
            {config.mode === 'advanced' ? <AdvancedTabs /> : (
              <div className="mt-4">
                <RadioGroup value={currentStatus} onValueChange={(value) => setCurrentStatus(value as TaskStatus)}>
                  {(['Pending', 'Completed', 'Skipped'] as TaskStatus[]).map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <RadioGroupItem value={status} id={`mobile-${status}`} />
                      <Label htmlFor={`mobile-${status}`}>{status}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button onClick={config.mode === 'advanced' ? handleAdvancedSave : () => handleStatusUpdate(currentStatus)}>
              Save Changes
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // للشاشات الكبيرة - Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={config.mode === 'advanced' ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : 'max-w-2xl'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {task.taskDescription}
          </DialogTitle>
          <DialogDescription>
            {config.mode === 'simple' ? 
              `Update status for this ${task.type.toLowerCase()} maintenance task` :
              'Complete task management interface with advanced features'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <TaskInfoSection />
          
          {config.mode === 'advanced' ? (
            <AdvancedTabs />
          ) : config.showStatusOnly ? (
            <div className="space-y-3">
              <Label className="text-base font-medium">Quick Status Update</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('Skipped')}
                  disabled={isLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Skip
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('Completed')}
                  disabled={isLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              </div>
            </div>
          ) : (
            <SimpleActions />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {config.mode === 'advanced' && (
            <Button onClick={handleAdvancedSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *                    EXPORT UTILITIES
 * ═══════════════════════════════════════════════════════════════ */

// دوال مساعدة لاستخدام النظام الموحد بطرق مختلفة
export const useSimpleTaskDialog = () => ({
  config: { mode: 'simple' as const, showStatusOnly: true }
});

export const useAdvancedTaskDialog = () => ({
  config: { 
    mode: 'advanced' as const, 
    showTimer: true, 
    showCost: true, 
    showQuality: true, 
    showNotes: true, 
    showAttachments: true 
  }
});

export const useQuickTaskDrawer = () => ({
  config: { mode: 'quick' as const, isMobile: true }
});

export const useMaintenanceTaskDialog = () => ({
  config: { 
    mode: 'advanced' as const, 
    showTimer: true, 
    showNotes: true, 
    showQuality: false, 
    showCost: false 
  }
});

export const useCleaningTaskDialog = () => ({
  config: { 
    mode: 'simple' as const, 
    showNotes: true, 
    showQuality: true, 
    showCost: false 
  }
});