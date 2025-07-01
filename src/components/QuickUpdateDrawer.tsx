// src/components/QuickUpdateDrawer.tsx

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MaintenanceTask } from './MaintenanceManagement'; // Assuming you export the interface

interface QuickUpdateDrawerProps {
  task: MaintenanceTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, newStatus: string, newNotes: string) => void;
}

export function QuickUpdateDrawer({ task, isOpen, onClose, onSave }: QuickUpdateDrawerProps) {
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setStatus(task.status || 'Scheduled');
      setNotes(task.notes || '');
    }
  }, [task]);

  const handleSave = () => {
    if (task) {
      onSave(task.id, status, notes);
    }
  };

  if (!task) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md p-4">
          <DrawerHeader>
            <DrawerTitle>Quick Update: {task.taskName}</DrawerTitle>
            <DrawerDescription>Update the status and add notes for this task.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-6 py-4">
            {/* Status Radios */}
            <div>
              <Label className="font-semibold">Status</Label>
              <RadioGroup value={status} onValueChange={setStatus} className="mt-2 grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="Completed" id="s-completed" /><Label htmlFor="s-completed">Completed</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Pending" id="s-pending" /><Label htmlFor="s-pending">Pending</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Delayed" id="s-delayed" /><Label htmlFor="s-delayed">Delayed</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Skipped" id="s-skipped" /><Label htmlFor="s-skipped">Skipped</Label></div>
              </RadioGroup>
            </div>
            
            {/* Notes Textarea */}
            <div>
              <Label htmlFor="notes" className="font-semibold">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about the task execution..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            
            {/* Image Upload */}
            <div>
              <Label htmlFor="picture" className="font-semibold">Attach Images (≤ 2MB)</Label>
              <Input id="picture" type="file" multiple accept="image/*" className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">Image upload functionality will be connected later.</p>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button onClick={handleSave}>Save & Close</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}