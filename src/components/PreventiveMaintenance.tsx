// src/components/PreventiveMaintenance.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase/config';
import { collection, onSnapshot, doc, writeBatch, Timestamp, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Eye, SlidersHorizontal } from 'lucide-react';
import { CreateMaintenancePlan } from './CreateMaintenancePlan';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { MaintenanceChecklist } from './MaintenanceChecklist';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Asset { id: string; name: string; }
export interface MaintenancePlan {
    id: string;
    planName: string;
    tasks: string[];
    assetId: string;
    assetName?: string;
    frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
    startDate: Timestamp;
}

export function PreventiveMaintenance() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [plans, setPlans] = useState<MaintenancePlan[]>([]);
    const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
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
                } as MaintenancePlan
            });
            setPlans(plansData);
        });
        return () => unsubPlans();
    }, [assets]);
    
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

            switch (plan.frequency) {
                case 'Weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                case 'Monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
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
                <Button onClick={() => setIsPlanFormOpen(true)}>
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
                                <SelectItem value="Weekly">Weekly</SelectItem>
                                <SelectItem value="Monthly">Monthly</SelectItem>
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
                                <CardFooter>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="w-full">
                                                <Eye className="mr-2 h-4 w-4" /> View Checklist
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                                            <MaintenanceChecklist plan={plan} />
                                        </DialogContent>
                                    </Dialog>
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
            />
        </div>
    );
}