// src/components/PreventiveMaintenance.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase/config';
import { collection, onSnapshot, doc, writeBatch, Timestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Eye, SlidersHorizontal, Edit, Trash2 } from 'lucide-react';
import { CreateMaintenancePlan } from './CreateMaintenancePlan';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MaintenanceChecklist } from './MaintenanceChecklist';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Asset { id: string; name: string; }

// --- تعديل: إضافة خيارات التكرار الجديدة ---
export type Frequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-annually' | 'Annually';

export interface MaintenancePlan {
    id: string;
    planName: string;
    tasks: string[];
    assetId: string;
    assetName?: string;
    frequency: Frequency;
    startDate: Timestamp;
}

export function PreventiveMaintenance() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [plans, setPlans] = useState<MaintenancePlan[]>([]);
    const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
    const [filters, setFilters] = useState({ assetId: '', frequency: '' });
    const { toast } = useToast();

    useEffect(() => {
        const unsubAssets = onSnapshot(collection(db, 'assets'), snap => {
            setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        });
        return () => unsubAssets();
    }, []);
    
    useEffect(() => {
        if(assets.length === 0) return;
        const unsubPlans = onSnapshot(collection(db, 'maintenance_plans'), snap => {
            const plansData = snap.docs.map(d => {
                const data = d.data();
                const asset = assets.find(a => a.id === data.assetId);
                return { 
                    id: d.id, 
                    ...data,
                    tasks: data.tasks || [],
                    assetName: asset?.name || 'Unknown Asset'
                } as MaintenancePlan;
            });
            setPlans(plansData);
        });
        return () => unsubPlans();
    }, [assets]);
    
    // --- تعديل: تحديث منطق إنشاء المهام ---
    const handlePlanCreated = async (plan: any) => {
        const batch = writeBatch(db);
        let tasksGeneratedCount = 0;
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        let nextDueDate = plan.startDate.toDate();

        while (nextDueDate <= oneYearFromNow) {
            plan.tasks.forEach((taskDesc: string) => {
                const newTaskRef = doc(collection(db, 'maintenance_tasks'));
                batch.set(newTaskRef, {
                    assetId: plan.assetId,
                    taskDescription: taskDesc,
                    type: 'Preventive',
                    status: 'Pending',
                    dueDate: Timestamp.fromDate(nextDueDate),
                    planId: plan.id,
                });
                tasksGeneratedCount++;
            });

            switch (plan.frequency as Frequency) {
                case 'Daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
                case 'Weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                case 'Monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
                case 'Quarterly': nextDueDate.setMonth(nextDueDate.getMonth() + 3); break;
                case 'Semi-annually': nextDueDate.setMonth(nextDueDate.getMonth() + 6); break;
                case 'Annually': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
                default: break;
            }
        }

        try {
            await batch.commit();
            toast({ title: "Success ✅", description: `Generated ${tasksGeneratedCount} tasks for the new plan.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to generate tasks.", variant: "destructive" });
        }
    };

    const handleEditPlan = (plan: MaintenancePlan) => {
        setEditingPlan(plan);
        setIsPlanFormOpen(true);
    };

    const handleDeletePlan = async (plan: MaintenancePlan) => {
        if(window.confirm(`Are you sure you want to delete the entire plan "${plan.planName}"? This action will also delete all associated future tasks and cannot be undone.`)) {
            try {
                await deleteDoc(doc(db, 'maintenance_plans', plan.id));
                toast({ title: "Plan Deleted", description: `The plan "${plan.planName}" has been removed.`});
            } catch (error) {
                console.error("Error deleting plan: ", error);
                toast({ title: "Error", description: "Could not delete the plan.", variant: "destructive" });
            }
        }
    }

    const filteredPlans = useMemo(() => {
        return plans.filter(plan => {
            const assetMatch = filters.assetId ? plan.assetId === filters.assetId : true;
            const frequencyMatch = filters.frequency ? plan.frequency === filters.frequency : true;
            return assetMatch && frequencyMatch;
        });
    }, [plans, filters]);
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Preventive Maintenance Plans</h2>
                <Button onClick={() => { setEditingPlan(null); setIsPlanFormOpen(true); }}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Create New PM Plan
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-md flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" />Filters</h3>
                        <Select value={filters.assetId} onValueChange={(value) => setFilters(f => ({ ...f, assetId: value === "all" ? "" : value }))}>
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Systems" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Systems</SelectItem>
                                {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filters.frequency} onValueChange={(value) => setFilters(f => ({ ...f, frequency: value === "all" ? "" : value }))}>
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Frequencies" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Frequencies</SelectItem>
                                <SelectItem value="Daily">Daily</SelectItem>
                                <SelectItem value="Weekly">Weekly</SelectItem>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                <SelectItem value="Semi-annually">Semi-annually</SelectItem>
                                <SelectItem value="Annually">Annually</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" onClick={() => setFilters({ assetId: '', frequency: '' })}>Reset</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredPlans.map(plan => (
                            <Card key={plan.id}>
                                <CardHeader>
                                    <CardTitle>{plan.planName}</CardTitle>
                                    <CardDescription>{plan.assetName} - {plan.frequency}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Includes {plan.tasks?.length || 0} task(s).
                                    </p>
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Eye className="mr-2 h-4 w-4" /> View Checklist
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>{plan.planName} Checklist</DialogTitle>
                                                <DialogDescription>
                                                    {plan.assetName} - {plan.frequency} - Plan starts on {plan.startDate.toDate().toLocaleDateString()}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <MaintenanceChecklist plan={plan} />
                                        </DialogContent>
                                    </Dialog>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => handleEditPlan(plan)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDeletePlan(plan)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                    {filteredPlans.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No maintenance plans match the current filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <CreateMaintenancePlan 
                isOpen={isPlanFormOpen} 
                onClose={() => setIsPlanFormOpen(false)} 
                assets={assets} 
                onPlanCreated={handlePlanCreated}
                editingPlan={editingPlan} 
            />
        </div>
    );
}