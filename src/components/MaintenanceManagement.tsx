// src/components/MaintenanceManagement.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase/config';
import { collection, onSnapshot, addDoc, doc, updateDoc, getDocs, writeBatch, Timestamp, query, where } from 'firebase/firestore';
import { DataTable } from './DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, SlidersHorizontal, ShieldCheck, Wrench, RefreshCw } from 'lucide-react';
import { CreateMaintenancePlan } from './CreateMaintenancePlan';

// --- Data Interfaces ---
interface MaintenanceTask {
    id: string;
    assetId: string;
    assetName?: string;
    taskDescription: string;
    type: 'Preventive' | 'Corrective';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Skipped';
    dueDate: Timestamp;
    assignedTo?: string;
    assignedToName?: string;
    completionNotes?: string;
    cost?: number;
}
interface Asset { id: string; name: string; }
interface User { id: string; name: string; }
interface MaintenancePlan {
    id: string;
    planName: string;
    taskDescription: string;
    assetId: string;
    frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
    isActive: boolean;
    lastGenerated: Timestamp;
}


export function MaintenanceManagement() {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Form States
    const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
    const [isCorrectiveFormOpen, setIsCorrectiveFormOpen] = useState(false);
    const [correctiveFormData, setCorrectiveFormData] = useState<Partial<MaintenanceTask>>({});
    
    // Filter States
    const [filters, setFilters] = useState({ status: '', type: '', assetId: '' });
    
    const { toast } = useToast();

    // Fetch initial data
    useEffect(() => {
        const unsubAssets = onSnapshot(collection(db, 'assets'), snap => {
            setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        });
        const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        });
        return () => { unsubAssets(); unsubUsers(); };
    }, []);

    // Fetch maintenance tasks
    useEffect(() => {
        const q = collection(db, 'maintenance_tasks');
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const tasksPromises = snapshot.docs.map(async (doc) => {
                const data = doc.data() as MaintenanceTask;
                const asset = assets.find(a => a.id === data.assetId);
                const user = users.find(u => u.id === data.assignedTo);
                return {
                    ...data,
                    id: doc.id,
                    assetName: asset?.name || 'Unknown',
                    assignedToName: user?.name || 'Unassigned',
                };
            });
            const resolvedTasks = await Promise.all(tasksPromises);
            setTasks(resolvedTasks);
        });

        return () => unsubscribe();
    }, [assets, users]);

    const handleGeneratePreventiveTasks = async () => {
        setIsGenerating(true);
        toast({ title: "Generating Tasks...", description: "Please wait." });

        const plansSnapshot = await getDocs(collection(db, 'maintenance_plans'));
        const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenancePlan));
        
        const batch = writeBatch(db);
        let tasksGeneratedCount = 0;
        const now = new Date();

        plans.forEach(plan => {
            if (!plan.isActive) return;

            const lastGeneratedDate = plan.lastGenerated.toDate();
            let nextDueDate = new Date(lastGeneratedDate);

            switch (plan.frequency) {
                case 'Daily': nextDueDate.setDate(lastGeneratedDate.getDate() + 1); break;
                case 'Weekly': nextDueDate.setDate(lastGeneratedDate.getDate() + 7); break;
                case 'Monthly': nextDueDate.setMonth(lastGeneratedDate.getMonth() + 1); break;
                case 'Quarterly': nextDueDate.setMonth(lastGeneratedDate.getMonth() + 3); break;
                case 'Annually': nextDueDate.setFullYear(lastGeneratedDate.getFullYear() + 1); break;
                default: return;
            }

            if (now >= nextDueDate) {
                const newTaskRef = doc(collection(db, 'maintenance_tasks'));
                batch.set(newTaskRef, {
                    assetId: plan.assetId,
                    taskDescription: plan.taskDescription,
                    type: 'Preventive',
                    status: 'Pending',
                    dueDate: Timestamp.fromDate(nextDueDate),
                    planId: plan.id,
                });

                const planRef = doc(db, 'maintenance_plans', plan.id);
                batch.update(planRef, { lastGenerated: Timestamp.now() });
                
                tasksGeneratedCount++;
            }
        });

        try {
            await batch.commit();
            if (tasksGeneratedCount > 0) {
                toast({ title: "Success ✅", description: `Generated ${tasksGeneratedCount} new preventive tasks.` });
            } else {
                toast({ title: "No new tasks", description: "All preventive tasks are already up to date." });
            }
        } catch (error) {
            console.error("Error generating tasks:", error);
            toast({ title: "Error", description: "An error occurred while generating tasks.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };
    
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

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const statusMatch = filters.status ? task.status === filters.status : true;
            const typeMatch = filters.type ? task.type === filters.type : true;
            const assetMatch = filters.assetId ? task.assetId === filters.assetId : true;
            return statusMatch && typeMatch && assetMatch;
        });
    }, [tasks, filters]);
    
    const columns: ColumnDef<MaintenanceTask>[] = [
        { accessorKey: "assetName", header: "Asset/System" },
        { accessorKey: "taskDescription", header: "Task Description" },
        { 
            accessorKey: "type", 
            header: "Type",
            cell: ({ row }) => row.original.type === 'Preventive' 
                ? <Badge variant="secondary">Preventive</Badge> 
                : <Badge variant="destructive">Corrective</Badge>
        },
        { accessorKey: "assignedToName", header: "Assigned To" },
        { 
            accessorKey: "dueDate", 
            header: "Due Date",
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
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Comprehensive Maintenance Management</h1>
                <div className="flex gap-2">
                    <Button onClick={handleGeneratePreventiveTasks} disabled={isGenerating}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Generating...' : 'Generate PM Tasks'}
                    </Button>
                    <Button onClick={() => setIsCorrectiveFormOpen(true)} variant="destructive">
                        <Wrench className="mr-2 h-4 w-4" /> Log Corrective Task
                    </Button>
                    <Button onClick={() => setIsPlanFormOpen(true)}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Manage Preventive Plans
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg mb-6">
                <h3 className="font-semibold text-lg mr-4">
                    <SlidersHorizontal className="inline-block mr-2 h-5 w-5" />
                    Filters
                </h3>
                <Select value={filters.assetId || "all"} onValueChange={(value) => setFilters(f => ({ ...f, assetId: value === "all" ? "" : value }))}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Assets" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Assets</SelectItem>
                        {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.type || "all"} onValueChange={(value) => setFilters(f => ({ ...f, type: value === "all" ? "" : value }))}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Preventive">Preventive</SelectItem>
                        <SelectItem value="Corrective">Corrective</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filters.status || "all"} onValueChange={(value) => setFilters(f => ({ ...f, status: value === "all" ? "" : value }))}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Skipped">Skipped</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="ghost" onClick={() => setFilters({ status: '', type: '', assetId: '' })}>Reset</Button>
            </div>

            <DataTable columns={columns} data={filteredTasks} filterColumn="taskDescription" />

            <CreateMaintenancePlan isOpen={isPlanFormOpen} onClose={() => setIsPlanFormOpen(false)} assets={assets} />

            <Dialog open={isCorrectiveFormOpen} onOpenChange={setIsCorrectiveFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log Corrective Maintenance Task</DialogTitle>
                        <DialogDescription>Use this form to log unexpected breakdowns and repairs.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                           <Label>Asset</Label>
                           <Select onValueChange={(v) => setCorrectiveFormData(d => ({...d, assetId: v}))}><SelectTrigger><SelectValue placeholder="Select an asset..." /></SelectTrigger><SelectContent>{assets.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
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
        </div>
    );
}