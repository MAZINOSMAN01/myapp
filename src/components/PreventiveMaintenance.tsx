// src/components/PreventiveMaintenance.tsx

import React, { useState, useEffect, useMemo } from 'react'
import { db } from '@/firebase/config'
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  writeBatch,
  addDoc,         // ← import addDoc
  Timestamp,
} from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  Edit,
  Trash2,
} from 'lucide-react'
import { CreateMaintenancePlan } from './CreateMaintenancePlan'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { MaintenanceChecklist } from './MaintenanceChecklist'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

export interface Asset {
  id: string
  name: string
  types: string[]
}

export type Frequency =
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-annually'
  | 'Annually'

export interface NewMaintenancePlan {
  assetId: string
  planName: string
  tasks: string[]
  frequency: Frequency
  firstDueDate: Timestamp
}

export interface MaintenancePlan extends NewMaintenancePlan {
  id: string
  assetName: string
}

export function PreventiveMaintenance() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [plans, setPlans] = useState<MaintenancePlan[]>([])
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<
    MaintenancePlan | null
  >(null)
  const [filters, setFilters] = useState({
    system: '',
    frequency: '',
  })
  const systemOptions = Array.from(new Set(assets.map((a) => a.name)))
  const { toast } = useToast()

  // Load assets + their types
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'assets'),
      (snap) => {
        const list = snap.docs.map((d) => {
          const raw = d.data() as any
          return {
            id: d.id,
            name: raw.name,
            types: raw.types || [],
          } as Asset
        })
        setAssets(list)
      }
    )
    return () => unsub()
  }, [])

  // Load saved plans + join on assetName
  useEffect(() => {
    if (!assets.length) return
    const unsub = onSnapshot(
      collection(db, 'maintenance_plans'),
      (snap) => {
        const list = snap.docs.map((d) => {
          const raw = d.data() as any
          const asset = assets.find((a) => a.id === raw.assetId)
          return {
            id: d.id,
            assetId: raw.assetId,
            planName: raw.planName,
            tasks: raw.tasks || [],
            frequency: raw.frequency,
            firstDueDate: raw.firstDueDate,
            assetName: asset?.name ?? 'Unknown',
          } as MaintenancePlan
        })
        setPlans(list)
      }
    )
    return () => unsub()
  }, [assets])

  // Create a new plan + schedule its tasks
  const handlePlanCreated = async (
    newPlan: NewMaintenancePlan
  ) => {
    try {
      // 1) create the plan document so we get an ID
      const planRef = await addDoc(
        collection(db, 'maintenance_plans'),
        {
          assetId: newPlan.assetId,
          planName: newPlan.planName,
          tasks: newPlan.tasks,
          frequency: newPlan.frequency,
          firstDueDate: newPlan.firstDueDate,
        }
      )

      // 2) now batch-generate one year of tasks, attaching planRef.id
      const batch = writeBatch(db)
      let count = 0
      const start = newPlan.firstDueDate.toDate()
      const limit = new Date(
        start.getFullYear() + 1,
        start.getMonth(),
        start.getDate()
      )
      let next = new Date(start)

      while (next <= limit) {
        newPlan.tasks.forEach((desc) => {
          const taskRef = doc(collection(db, 'maintenance_tasks'))
          batch.set(taskRef, {
            assetId: newPlan.assetId,
            planId: planRef.id,
            taskDescription: desc,
            type: 'Preventive',
            status: 'Pending',
            dueDate: Timestamp.fromDate(next),
          })
          count++
        })

        switch (newPlan.frequency) {
          case 'Daily':
            next.setDate(next.getDate() + 1)
            break
          case 'Weekly':
            next.setDate(next.getDate() + 7)
            break
          case 'Monthly':
            next.setMonth(next.getMonth() + 1)
            break
          case 'Quarterly':
            next.setMonth(next.getMonth() + 3)
            break
          case 'Semi-annually':
            next.setMonth(next.getMonth() + 6)
            break
          case 'Annually':
            next.setFullYear(next.getFullYear() + 1)
            break
        }
      }

      await batch.commit()
      toast({
        title: 'Success',
        description: `Generated ${count} tasks.`,
      })
    } catch (e) {
      console.error(e)
      toast({
        title: 'Error',
        description: 'Failed to create plan & tasks.',
        variant: 'destructive',
      })
    }
  }

  const handleEditPlan = (p: MaintenancePlan) => {
    setEditingPlan(p)
    setIsPlanFormOpen(true)
  }

  const handleDeletePlan = async (p: MaintenancePlan) => {
    if (
      !window.confirm(
        `Delete plan "${p.planName}" and its future tasks?`
      )
    )
      return
    try {
      await deleteDoc(
        doc(db, 'maintenance_plans', p.id)
      )
      toast({ title: 'Deleted', description: p.planName })
    } catch (e) {
      console.error(e)
      toast({
        title: 'Error',
        description: 'Could not delete plan.',
        variant: 'destructive',
      })
    }
  }

  const filteredPlans = useMemo(
    () =>
      plans.filter((p) => {
        const sysOK = filters.system
          ? p.assetName === filters.system
          : true
        const fOK = filters.frequency
          ? p.frequency === filters.frequency
          : true
         return sysOK && fOK
      }),
    [plans, filters]
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Preventive Maintenance Plans
        </h2>
        <Button
          onClick={() => {
            setEditingPlan(null)
            setIsPlanFormOpen(true)
          }}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Create New PM Plan
        </Button>
      </div>

      {/* Filters + list of plans */}
      <Card>
        <CardHeader>
          <div className="flex gap-4 items-center">
            <SlidersHorizontal className="h-5 w-5" />
            <Select
                value={filters.system}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                 system: v === 'all' ? '' : v,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Systems
                </SelectItem>
                   {systemOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.frequency}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  frequency: v === 'all' ? '' : v,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Frequencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Frequencies
                </SelectItem>
                {(
                  [
                    'Daily',
                    'Weekly',
                    'Monthly',
                    'Quarterly',
                    'Semi-annually',
                    'Annually',
                  ] as Frequency[]
                ).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              onClick={() =>
                 setFilters({ system: '', frequency: '' })
              }
            >
              Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.planName}</CardTitle>
                  <CardDescription>
                    {plan.assetName} — {plan.frequency}{' '}
                    {plan.firstDueDate && (
                      <>— Starts{' '}
                      {plan.firstDueDate
                        .toDate()
                        .toLocaleDateString()}
                      </>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Includes {plan.tasks.length} task(s).
                  </p>
                </CardContent>

                <CardFooter className="flex justify-between">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Eye className="mr-2 h-4 w-4" />
                        View Checklist
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>
                          {plan.planName} Checklist
                        </DialogTitle>
                        <DialogDescription>
                          {plan.assetName} — {plan.frequency}{' '}
                          {plan.firstDueDate && (
                            <>— Starts{' '}
                            {plan.firstDueDate
                              .toDate()
                              .toLocaleDateString()}
                            </>
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <MaintenanceChecklist plan={plan} />
                    </DialogContent>
                  </Dialog>

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
                      onClick={() => handleDeletePlan(plan)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}

            {filteredPlans.length === 0 && (
              <p className="text-center col-span-full py-12 text-muted-foreground">
                No maintenance plans match the current filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateMaintenancePlan
        isOpen={isPlanFormOpen}
        onClose={() => setIsPlanFormOpen(false)}
        assets={assets}
        onPlanCreated={handlePlanCreated}
        editingPlan={editingPlan ?? undefined}
      />
    </div>
  )
}
