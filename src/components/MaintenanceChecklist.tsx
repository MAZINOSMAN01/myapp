import React, { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { MaintenancePlan, Frequency } from './PreventiveMaintenance';

interface MaintenanceTask {
  id: string;
  taskDescription: string;
  dueDate: Timestamp;
  status: 'Pending' | 'Completed' | 'Skipped';
}

interface Props {
  plan: MaintenancePlan;
}

export function MaintenanceChecklist({ plan }: Props) {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  /*───────────────────────────────
   * 1) جلب المهام للفترة المناسبة
   *───────────────────────────────*/
  useEffect(() => {
    if (!plan?.id) return;

    setIsLoading(true);
    const today = new Date();
    let startPeriod: Date, endPeriod: Date;

    switch (plan.frequency) {
      case 'Daily': // الأسبوع الحالي
        startPeriod = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - today.getDay(),
        );
        endPeriod = new Date(
          startPeriod.getFullYear(),
          startPeriod.getMonth(),
          startPeriod.getDate() + 6,
        );
        break;
      case 'Weekly': // الشهر الحالي
        startPeriod = new Date(today.getFullYear(), today.getMonth(), 1);
        endPeriod = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default: // العام الحالي
        startPeriod = new Date(today.getFullYear(), 0, 1);
        endPeriod = new Date(today.getFullYear(), 11, 31);
        break;
    }

    const q = query(
      collection(db, 'maintenance_tasks'),
      where('planId', '==', plan.id),
      where('dueDate', '>=', Timestamp.fromDate(startPeriod)),
      where('dueDate', '<=', Timestamp.fromDate(endPeriod)),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setTasks(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceTask)),
        );
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        toast({
          title: 'Database Error',
          description: 'Failed to fetch tasks.',
          variant: 'destructive',
        });
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [plan.id, plan.frequency, toast]);

  /*───────────────────────────────
   * 2) تحديث حالة المهمة
   *───────────────────────────────*/
  const handleStatusUpdate = async (
    task: MaintenanceTask | undefined,
    newStatus: 'Completed' | 'Skipped',
  ) => {
    if (!task || task.status === newStatus) return;
    try {
      await updateDoc(doc(db, 'maintenance_tasks', task.id), {
        status: newStatus,
      });
      toast({ title: 'Success', description: `Task marked as ${newStatus}.` });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task status.',
        variant: 'destructive',
      });
    }
  };

  /*───────────────────────────────
   * 3) عناوين الأعمدة
   *───────────────────────────────*/
  const getColumnHeaders = () => {
    const today = new Date();
    switch (plan.frequency) {
      case 'Daily': {
        const startOfWeek = new Date(
          today.setDate(today.getDate() - today.getDay()),
        );
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          return {
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            date: d.getDate(),
          };
        });
      }
      case 'Weekly':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case 'Monthly':
        return [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
      case 'Quarterly':
        return ['Q1', 'Q2', 'Q3', 'Q4'];
      case 'Semi-annually':
        return ['First Half', 'Second Half'];
      case 'Annually':
        return [String(today.getFullYear())];
      default:
        return [];
    }
  };

  /*───────────────────────────────
   * 4) إيجاد المهمة المناسبة للخلية
   *───────────────────────────────*/
  const findTaskForTimeSlot = (desc: string, slot: number) =>
    tasks.find((t) => {
      if (t.taskDescription !== desc) return false;
      const due = t.dueDate.toDate();
      switch (plan.frequency) {
        case 'Daily':
          return due.getDay() === slot;
        case 'Weekly':
          return Math.floor((due.getDate() - 1) / 7) === slot;
        case 'Monthly':
          return due.getMonth() === slot;
        case 'Quarterly':
          return Math.floor(due.getMonth() / 3) === slot;
        case 'Semi-annually':
          return Math.floor(due.getMonth() / 6) === slot;
        case 'Annually':
          return true;
        default:
          return false;
      }
    });

  const headers = getColumnHeaders();

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading checklist…</span>
      </div>
    );

  /*───────────────────────────────
   *       جدول المهام
   *───────────────────────────────*/
  return (
    <div className="space-y-4 h-full flex flex-col pt-0">
      <div className="border rounded-lg overflow-auto flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 w-[300px] max-w-[300px] bg-background">
                Task Description
              </TableHead>
              {headers.map((h, i) => (
                <TableHead key={i} className="text-center whitespace-nowrap">
                  {typeof h === 'string' ? h : `${h.day} ${h.date}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {(plan.tasks || []).map((desc, r) => (
              <TableRow key={r}>
                {/* وصف المهمة مع Scroll عمودي إن طال النص */}
                <TableCell className="sticky left-0 z-10 w-[300px] max-w-[300px] bg-background">
                  <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                    {desc}
                  </div>
                </TableCell>

                {headers.map((_, c) => {
                  const task = findTaskForTimeSlot(desc, c);
                  return (
                    <TableCell key={c} className="text-center">
                      {task ? (
                        <div className="flex justify-center items-center gap-1">
                          {/* ✅ */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() =>
                              handleStatusUpdate(task, 'Completed')
                            }
                          >
                            <CheckCircle2
                              className={`h-5 w-5 ${
                                task.status === 'Completed'
                                  ? 'text-green-500'
                                  : 'text-gray-400 hover:text-green-500'
                              }`}
                            />
                          </Button>
                          {/* ❌ */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleStatusUpdate(task, 'Skipped')}
                          >
                            <XCircle
                              className={`h-5 w-5 ${
                                task.status === 'Skipped'
                                  ? 'text-red-500'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                            />
                          </Button>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ملاحظات الفترة */}
      <div className="space-y-2 mt-auto flex-shrink-0">
        <Label htmlFor="notes">Notes for this Period</Label>
        <Textarea
          id="notes"
          placeholder="Add any relevant notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}
