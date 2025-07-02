// src/components/CorrectiveMaintenance.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase/config';
import { collection, onSnapshot, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { DataTable } from './DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // **The missing import**

// Data Interfaces
interface MaintenanceTask {
    id: string;
    assetId: string;
    assetName?: string;
    taskDescription: string;
    type: 'Preventive' | 'Corrective';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Skipped';
    dueDate: Timestamp;
    cost?: number;
}
interface Asset { id: string; name: string; }

export function CorrectiveMaintenance() {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isCorrectiveFormOpen, setIsCorrectiveFormOpen] = useState(false);
    const [correctiveFormData, setCorrectiveFormData] = useState<Partial<MaintenanceTask>>({});
    const { toast } = useToast();

    useEffect(() => {
        const unsubAssets = onSnapshot(collection(db, 'assets'), snap => {
            setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        });
        return () => unsubAssets();
    }, []);

    useEffect(() => {
        if (assets.length === 0) return;

        const q = query(collection(db, 'maintenance_tasks'), where('type', '==', 'Corrective'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const tasksData = snapshot.docs.map(doc => {
                const data = doc.data();
                const asset = assets.find(a => a.id === data.assetId);
                return {
                    id: doc.id,
                    ...data,
                    assetName: asset?.name || 'Unknown',
                } as MaintenanceTask;
            });
            setTasks(tasksData);
        });

        return () => unsubscribe();
    }, [assets]);

    const handleSaveCorrectiveTask = async () => {
        const { assetId, taskDescription, dueDate } = correctiveFormData;
        if (!assetId || !taskDescription || !dueDate) {
            toast({ title: "Error", description: "Please fill out Asset, Description, and Due Date.", variant: "destructive" });
            return;
        }

        try {
            await addDoc(collection(db, 'maintenance_tasks'), {
                ...correctiveFormData,
                type: 'Corrective',
                status: 'Pending',
            });
            toast({ title: "Success", description: "Corrective maintenance task has been logged." });
            setIsCorrectiveFormOpen(false);
        } catch (error) {
            console.error("Error saving corrective task:", error);
            toast({ title: "Error", description: "Failed to log the task.", variant: "destructive" });
        }
    };

    const columns: ColumnDef<MaintenanceTask>[] = [
        { accessorKey: "assetName", header: "Asset/System" },
        { accessorKey: "taskDescription", header: "Problem Description" },
        { 
            accessorKey: "dueDate", 
            header: "Date Logged",
            cell: ({ row }) => new Date(row.original.dueDate.seconds * 1000).toLocaleDateString()
        },
        { 
            accessorKey: "status", 
            header: "Status",
            cell: ({ row }) => <Badge>{row.original.status}</Badge>
        },
        {
            accessorKey: 'cost',
            header: 'Cost',
            cell: ({ row }) => row.original.cost ? `$${row.original.cost.toFixed(2)}` : 'N/A'
        }
    ];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Corrective Maintenance Log</CardTitle>
                <Button onClick={() => setIsCorrectiveFormOpen(true)} variant="destructive">
                    <Wrench className="mr-2 h-4 w-4" /> Log New Corrective Task
                </Button>
            </CardHeader>
            <CardContent>
                <DataTable columns={columns} data={tasks} filterColumn="taskDescription" />
                <Dialog open={isCorrectiveFormOpen} onOpenChange={setIsCorrectiveFormOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Log Corrective Maintenance Task</DialogTitle>
                            <DialogDescription>Use this form to log unexpected breakdowns and repairs.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                               <Label>Asset</Label>
                               <Select onValueChange={(v) => setCorrectiveFormData(d => ({...d, assetId: v}))}><SelectTrigger><SelectValue placeholder="Select an asset..."/></SelectTrigger><SelectContent>{assets.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div className="space-y-2">
                               <Label>Problem / Task Description</Label>
                               <Input placeholder="e.g., Main water line is leaking" onChange={(e) => setCorrectiveFormData(d => ({...d, taskDescription: e.target.value}))}/>
                            </div>
                             <div className="space-y-2">
                               <Label>Date</Label>
                               <Input type="date" onChange={(e) => setCorrectiveFormData(d => ({...d, dueDate: Timestamp.fromDate(new Date(e.target.value))}))}/>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCorrectiveFormOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveCorrectiveTask}>Save Task</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}