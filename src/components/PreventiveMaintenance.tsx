// src/components/PreventiveMaintenance.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase/config';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CreateMaintenancePlan } from './CreateMaintenancePlan';
import { MaintenanceChecklist } from './MaintenanceChecklist';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ShieldCheck, Eye, Edit, Trash2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */
/*  الأنـــواع ــ> متطابقة مع CreateMaintenancePlan.tsx               */
/* ------------------------------------------------------------------ */
type Frequency =
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-annually'
  | 'Annually';

interface AssetType {
  name: string;
  location?: string;
}

interface Asset {
  id: string;
  name: string;
  types: AssetType[];
}

interface MaintenancePlan {
  /** الحقول المطلوبة فى النموذج */
  id: string;
  assetId: string;
  planName: string;
  frequency: Frequency;
  firstDueDate: Timestamp;
  tasks: string[];

  /** حقول إضافيّة نستخدمها محلياً */
  assetName: string;
  location?: string;
  assignedTo?: string;
  completed?: boolean;
}
/* ------------------------------------------------------------------ */

export function PreventiveMaintenance() {
  /* ----------------------- الحالة ----------------------- */
  const [assets, setAssets]               = useState<Asset[]>([]);
  const [plans, setPlans]                 = useState<MaintenancePlan[]>([]);
  const [filterSystem, setFilterSystem]   = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan]     = useState<MaintenancePlan | null>(
    null,
  );

  const { toast } = useToast();

  /* ------------------- تحميل الأصول ------------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'assets'), (snap) => {
      const list = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          name: raw.name,
          types: raw.types || [],
        } as Asset;
      });
      setAssets(list);
    });
    return unsub;
  }, []);

  /* ------------------- تحميل الخطط ------------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'maintenance_plans'), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MaintenancePlan, 'id'>),
      })) as MaintenancePlan[];
      setPlans(list);
    });
    return unsub;
  }, []);

  /* ---------------- بيانات مشتقة ---------------- */
  const systemOptions = useMemo(
    () => Array.from(new Set(assets.map((a) => a.name))).sort(),
    [assets],
  );

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const bySystem = filterSystem === 'all' ? true : p.assetName === filterSystem;
      const byDone   = showCompleted ? true : !p.completed;
      return bySystem && byDone;
    });
  }, [plans, filterSystem, showCompleted]);

  /* ---------------- معالِجات ---------------- */
  const handlePlanCreated = async (): Promise<void> => {
    setIsPlanFormOpen(false);
    setEditingPlan(null);
    toast({
      description: 'Maintenance plan saved successfully.',
      variant: 'default', // union المدعومة: default | destructive
    });
  };

  const handleDeletePlan = async (planId: string) => {
    await deleteDoc(doc(db, 'maintenance_plans', planId));
    toast({ description: 'Plan deleted.', variant: 'destructive' });
  };

  const handleEditPlan = (plan: MaintenancePlan) => {
    setEditingPlan(plan);
    setIsPlanFormOpen(true);
  };

  /* ---------------- الواجهة ---------------- */
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3 flex-wrap">
            {/* فلتر الأنظمة */}
            <Select value={filterSystem} onValueChange={setFilterSystem}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                {systemOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* إظهار المنتهى/إخفاؤه */}
            <Button
              variant="outline"
              size="sm"
              className="flex gap-2"
              onClick={() => setShowCompleted((p) => !p)}
            >
              <ShieldCheck className="h-4 w-4" />
              {showCompleted ? 'Hide Completed' : 'Show Completed'}
            </Button>
          </div>

          <Button onClick={() => setIsPlanFormOpen(true)}>
            Create New PM Plan
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{plan.planName}</CardTitle>

                      <CardDescription className="mt-1">
                        <span className="flex items-center gap-1 text-sm">
                          <span>{plan.assetName}</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{plan.frequency}</span>
                        </span>
                        {plan.firstDueDate && (
                          <>
                            <br />
                            <span className="text-xs text-muted-foreground">
                              Starts {plan.firstDueDate.toDate().toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>

                    {plan.location && (
                      <Badge variant="outline" className="ml-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs">{plan.location}</span>
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Includes {plan.tasks.length} task(s).
                  </p>
                </CardContent>

                <CardFooter className="flex justify-between pt-3">
                  {/* عرض الـChecklist */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        View Checklist
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[800px]">
                      <DialogHeader>
                        <DialogTitle>{plan.planName}</DialogTitle>
                        <DialogDescription className="flex items-center gap-1">
                          {plan.assetName} — {plan.frequency}
                          {plan.firstDueDate && (
                            <>
                              — Starts{' '}
                              {plan.firstDueDate.toDate().toLocaleDateString()}
                            </>
                          )}
                        </DialogDescription>
                      </DialogHeader>

                      <MaintenanceChecklist plan={plan} />
                    </DialogContent>
                  </Dialog>

                  {/* أزرار التعديل/الحذف */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditPlan(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* نافذة إنشاء/تعديل الخطة */}
      <CreateMaintenancePlan
        isOpen={isPlanFormOpen}
        onClose={() => {
          setIsPlanFormOpen(false);
          setEditingPlan(null);
        }}
        assets={assets}
        users={[]}
        onPlanCreated={handlePlanCreated}
        editingPlan={editingPlan ?? undefined}
      />
    </div>
  );
}
