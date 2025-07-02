// src/components/MaintenanceChecklist.tsx

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { doc, updateDoc, Timestamp, collection, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { MaintenancePlan } from './PreventiveMaintenance';

interface MaintenanceTask {
    id:string;
    taskDescription: string;
    dueDate: Timestamp;
    status: 'Pending' | 'Completed' | 'Skipped';
}

interface Props {
  plan: MaintenancePlan;
}

export function MaintenanceChecklist({ plan }: Props) {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [notes, setNotes] = useState('');
    const { toast } = useToast();

    // Fetch tasks for the relevant period (this week or this month)
    useEffect(() => {
        if (!plan?.id) return;
        
        const today = new Date();
        let startPeriod: Date, endPeriod: Date;

        if (plan.frequency === 'Weekly') {
            const dayOfWeek = today.getDay(); 
            startPeriod = new Date(today);
            startPeriod.setDate(today.getDate() - dayOfWeek);
            startPeriod.setHours(0, 0, 0, 0);

            endPeriod = new Date(startPeriod);
            endPeriod.setDate(startPeriod.getDate() + 6);
        } else { // Monthly
            startPeriod = new Date(today.getFullYear(), today.getMonth(), 1);
            endPeriod = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        const q = query(
            collection(db, "maintenance_tasks"),
            where("planId", "==", plan.id),
            where("dueDate", ">=", Timestamp.fromDate(startPeriod)),
            where("dueDate", "<=", Timestamp.fromDate(endPeriod))
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedTasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceTask));
            setTasks(fetchedTasks);
        });

        return () => unsubscribe();
    }, [plan.id, plan.frequency]);
    
    // Function to update task status (✓ or X)
    const handleStatusUpdate = async (task: MaintenanceTask | undefined, newStatus: 'Completed' | 'Skipped') => {
        if (!task) {
            toast({ title: 'Error', description: 'Task not found for this time slot.', variant: 'destructive'});
            return;
        };
        const taskRef = doc(db, 'maintenance_tasks', task.id);
        try {
            await updateDoc(taskRef, { status: newStatus });
            toast({ title: 'Success', description: `Task status updated.` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update task status.', variant: 'destructive' });
        }
    };
    
    const handleDeletePlan = async () => {
        if(window.confirm(`Are you sure you want to delete the entire plan "${plan.planName}"? This action cannot be undone.`)) {
            await deleteDoc(doc(db, 'maintenance_plans', plan.id));
            toast({ title: "Plan Deleted", description: `The plan "${plan.planName}" has been removed.`});
            // Note: In a production app, you would also delete all associated tasks.
        }
    }

    const getColumnHeaders = () => {
        if (plan.frequency === 'Monthly') {
            return ["Week 1", "Week 2", "Week 3", "Week 4"];
        }
        // Weekly
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: date.getDate()
            };
        });
    };

    const findTaskForTimeSlot = (taskDesc: string, timeSlotIndex: number) => {
        return tasks.find(t => {
            if (t.taskDescription !== taskDesc) return false;
            
            const dueDate = t.dueDate.toDate();
            
            if (plan.frequency === 'Weekly') {
                const dayOfWeek = dueDate.getDay();
                return dayOfWeek === timeSlotIndex;
            } else { // Monthly
                const weekOfMonth = Math.floor((dueDate.getDate() - 1) / 7);
                return weekOfMonth === timeSlotIndex;
            }
        });
    };
    
    const columnHeaders = getColumnHeaders();

    return (
        <div className="p-4 space-y-4 h-full flex flex-col">
            <header className="text-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">{plan.planName}</h2>
                <p className="text-muted-foreground">{plan.assetName} - {plan.frequency} Checklist</p>
            </header>

            <div className="border rounded-lg overflow-auto flex-grow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px] sticky left-0 bg-background z-10">Task Description</TableHead>
                            {columnHeaders.map((header, index) => (
                                <TableHead key={index} className="text-center">
                                    {typeof header === 'string' ? header : `${header.day} ${header.date}`}
                                </TableHead>
                            ))}
                            <TableHead className="text-right sticky right-0 bg-background z-10">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(plan.tasks || []).map((taskDesc, rowIndex) => (
                            <TableRow key={rowIndex}>
                                <TableCell className="font-medium sticky left-0 bg-background z-10">{taskDesc}</TableCell>
                                {columnHeaders.map((_, colIndex) => {
                                    const taskForSlot = findTaskForTimeSlot(taskDesc, colIndex);
                                    return (
                                        <TableCell key={colIndex} className="text-center">
                                            {taskForSlot ? (
                                                <div className="flex justify-center items-center gap-1">
                                                    {taskForSlot.status === 'Completed' ? <CheckCircle2 className="text-green-500"/> :
                                                     taskForSlot.status === 'Skipped' ? <XCircle className="text-red-500"/> :
                                                     <>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStatusUpdate(taskForSlot, 'Completed')}><CheckCircle2 className="h-5 w-5 text-gray-400 hover:text-green-500"/></Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStatusUpdate(taskForSlot, 'Skipped')}><XCircle className="h-5 w-5 text-gray-400 hover:text-red-500"/></Button>
                                                     </>
                                                    }
                                                </div>
                                            ) : (<span>-</span>)}
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="text-right sticky right-0 bg-background z-10">
                                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={handleDeletePlan}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <div className="space-y-2 mt-6 flex-shrink-0">
                <Label htmlFor="notes">Notes for this Period</Label>
                <Textarea id="notes" placeholder="Add any relevant notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
        </div>
    );
}