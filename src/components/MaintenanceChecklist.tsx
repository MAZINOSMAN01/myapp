// src/components/MaintenanceChecklist.tsx
// نسخة مُحسَّنة تجمع الخصائص المتقدمة مع استقرار الإصدار القديم

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc, 
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Pause,
  Timer,
  Star,
  Camera,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  Eye,
  RotateCcw,
} from 'lucide-react';
import type { MaintenancePlan, Frequency } from "@/types/maintenance"

/*───────────────────────────────────────────
 * 0) الأنواع الموسّعة
 *──────────────────────────────────────────*/

type TaskStatus =
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Partially Done'
  | 'Needs Review'
  | 'Skipped'
  | 'Failed';

// السماح بـ 0 لإظهار "بلا تقييم بعد"
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

interface TaskTimer {
  startTime?: Timestamp;
  endTime?: Timestamp;
  totalDuration: number; // بالدقائق
  isPaused: boolean;
  pausedDuration: number; // إجمالي زمن التوقف
}

interface TaskNote {
  id: string;
  text: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface AdvancedMaintenanceTask {
  id: string;
  taskDescription: string;
  dueDate: Timestamp;
  status: TaskStatus;
  qualityRating?: Exclude<QualityRating, 0>; // لا نخزن 0 في القاعدة
  timer: TaskTimer;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedDuration?: number;
  notes: TaskNote[];
  assignedTo?: string;
  completedBy?: string;
  lastModified: Timestamp;
}

interface Props {
   /** Optional plan object; if not provided, planId will be read from route */
  plan?: MaintenancePlan
}

/*───────────────────────────────────────────
 * 1) مكوّنات مساعدة
 *──────────────────────────────────────────*/

/** تقييم الجودة بالنجوم */
const StarRating: React.FC<{
  rating: QualityRating;
  onRatingChange: (rating: Exclude<QualityRating, 0>) => void;
  readonly?: boolean;
}> = ({ rating, onRatingChange, readonly = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Button
          key={star}
          variant="ghost"
          size="sm"
          className="p-0 h-6 w-6"
          onClick={() => !readonly && onRatingChange(star as Exclude<QualityRating, 0>)}
          disabled={readonly}
          title={`${star} stars`}
        >
          <Star
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        </Button>
      ))}
    </div>
  );
};

/** مؤقت المهمة */
const TaskTimerComponent: React.FC<{
  timer: TaskTimer;
  onTimerUpdate: (timer: TaskTimer) => void;
}> = ({ timer, onTimerUpdate }) => {
  const [isRunning, setIsRunning] = useState(
    !timer.isPaused && Boolean(timer.startTime) && !timer.endTime,
  );
  const [currentDuration, setCurrentDuration] = useState(timer.totalDuration);
  const intervalRef = useRef<number | null>(null);

  /* تشغيل/إيقاف المؤقت الحي */
  useEffect(() => {
    if (isRunning && timer.startTime) {
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const start = timer.startTime!.toDate().getTime();
        const elapsed = Math.floor((now - start) / 60000); // بالدقائق
        setCurrentDuration(elapsed - timer.pausedDuration);
      }, 1000);
    } else if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isRunning, timer.startTime, timer.pausedDuration]);

  /* دوال التحكم */
  const startTimer = () => {
    const newTimer: TaskTimer = {
      ...timer,
      startTime: timer.startTime ?? Timestamp.now(),
      isPaused: false,
    };
    setIsRunning(true);
    onTimerUpdate(newTimer);
  };

  const pauseTimer = () => {
    const newTimer: TaskTimer = {
      ...timer,
      isPaused: true,
      totalDuration: currentDuration,
      pausedDuration: timer.pausedDuration + (currentDuration - timer.totalDuration),
    };
    setIsRunning(false);
    onTimerUpdate(newTimer);
  };

  const stopTimer = () => {
    const newTimer: TaskTimer = {
      ...timer,
      endTime: Timestamp.now(),
      totalDuration: currentDuration,
      isPaused: false,
    };
    setIsRunning(false);
    onTimerUpdate(newTimer);
  };

  const resetTimer = () => {
    const newTimer: TaskTimer = {
      totalDuration: 0,
      isPaused: false,
      pausedDuration: 0,
    };
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    setIsRunning(false);
    setCurrentDuration(0);
    onTimerUpdate(newTimer);
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
        <Timer className="h-4 w-4" />
        <span>{formatDuration(currentDuration)}</span>
      </div>
      <div className="flex gap-1">
        {!isRunning && !timer.endTime && (
          <Button size="sm" variant="outline" onClick={startTimer} className="h-7 w-7 p-0" title="Start">
            <Play className="h-3 w-3" />
          </Button>
        )}
        {isRunning && (
          <Button size="sm" variant="outline" onClick={pauseTimer} className="h-7 w-7 p-0" title="Pause">
            <Pause className="h-3 w-3" />
          </Button>
        )}
        {(isRunning || timer.isPaused) && !timer.endTime && (
          <Button size="sm" variant="default" onClick={stopTimer} className="h-7 w-7 p-0" title="Stop">
            <CheckCircle className="h-3 w-3" />
          </Button>
        )}
        {currentDuration > 0 && (
          <Button size="sm" variant="outline" onClick={resetTimer} className="h-7 w-7 p-0" title="Reset">
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

/** شارة حالة المهمة */
const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const getConfig = () => {
    switch (status) {
      case 'Pending':
        return { cls: 'bg-gray-100 text-gray-800', Icon: Clock };
      case 'In Progress':
        return { cls: 'bg-blue-100 text-blue-800', Icon: PlayCircle };
      case 'Completed':
        return { cls: 'bg-green-100 text-green-800', Icon: CheckCircle };
      case 'Partially Done':
        return { cls: 'bg-yellow-100 text-yellow-800', Icon: CheckCircle2 };
      case 'Needs Review':
        return { cls: 'bg-orange-100 text-orange-800', Icon: Eye };
      case 'Skipped':
        return { cls: 'bg-gray-100 text-gray-600', Icon: XCircle };
      case 'Failed':
        return { cls: 'bg-red-100 text-red-800', Icon: AlertTriangle };
      default:
        return { cls: 'bg-gray-100 text-gray-800', Icon: Clock };
    }
  };
  const { cls, Icon } = getConfig();
  return (
    <Badge className={`${cls} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
};

/*───────────────────────────────────────────
 * 2) المكوّن الرئيسي
 *──────────────────────────────────────────*/

export function MaintenanceChecklist({ plan: initialPlan }: Props) {
  const { planId } = useParams<{ planId?: string }>()

  const [plan, setPlan] = useState<MaintenancePlan | null>(initialPlan ?? null)
  const [tasks, setTasks] = useState<AdvancedMaintenanceTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [periodNotes, setPeriodNotes] = useState('')
  const [selectedTask, setSelectedTask] = useState<AdvancedMaintenanceTask | null>(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [newNote, setNewNote] = useState('')
  const { toast } = useToast()

  /* جلب الخطة إذا لم تمرر كمُعطى */
  useEffect(() => {
    if (initialPlan || !planId) return
    getDoc(doc(db, 'maintenance_plans', planId)).then(d => {
      if (d.exists()) setPlan({ id: d.id, ...(d.data() as any) } as MaintenancePlan)
    })
  }, [initialPlan, planId])


  /*──────────────────── 2.1 جلب البيانات */
  useEffect(() => {
    if (!plan?.id) return;

    setIsLoading(true);
    const today = new Date();
    let startPeriod: Date, endPeriod: Date;

    switch (plan.frequency) {
      case 'Daily':
        startPeriod = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        endPeriod = new Date(startPeriod.getFullYear(), startPeriod.getMonth(), startPeriod.getDate() + 6);
        break;
      case 'Weekly':
        startPeriod = new Date(today.getFullYear(), today.getMonth(), 1);
        endPeriod = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
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

    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched: AdvancedMaintenanceTask[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const task: AdvancedMaintenanceTask = {
            id: d.id,
            taskDescription: data.taskDescription ?? '',
            dueDate: data.dueDate,
            status: data.status ?? 'Pending',
            qualityRating: data.qualityRating,
            timer: data.timer ?? {
              totalDuration: 0,
              isPaused: false,
              pausedDuration: 0,
            },
            priority: data.priority ?? 'Medium',
            estimatedDuration: data.estimatedDuration,
            notes: data.notes ?? [],
            assignedTo: data.assignedTo,
            completedBy: data.completedBy,
            lastModified: data.lastModified ?? Timestamp.now(),
          };
          return task;
        });
        setTasks(fetched);
        setIsLoading(false);
      },
      (err) => {
        console.error(err);
        toast({ title: 'DB Error', description: 'Unable to fetch tasks.', variant: 'destructive' });
        setIsLoading(false);
      },
    );

    return () => unsub();
  }, [plan.id, plan.frequency, toast]);

  /*──────────────────── 2.2 التحديثات */
  const updateTask = async (taskId: string, partial: Partial<AdvancedMaintenanceTask>) => {
    try {
      await updateDoc(doc(db, 'maintenance_tasks', taskId), {
        ...partial,
        lastModified: Timestamp.now(),
      });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
      throw e;
    }
  };

  const handleStatusUpdate = async (task: AdvancedMaintenanceTask, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    try {
      await updateTask(task.id, {
        status: newStatus,
        completedBy: newStatus === 'Completed' ? 'current_user' : task.completedBy,
      });
      toast({ title: 'Updated', description: `Status → ${newStatus}.` });
    } catch {/* toast داخل updateTask */}
  };

  const handleQualityRatingUpdate = async (task: AdvancedMaintenanceTask, rating: Exclude<QualityRating, 0>) => {
    try {
      await updateTask(task.id, { qualityRating: rating });
      toast({ title: 'Updated', description: `Quality ★ ${rating}` });
    } catch {/* */}
  };

  const handleTimerUpdate = async (task: AdvancedMaintenanceTask, timer: TaskTimer) => {
    try {
      await updateTask(task.id, { timer });
    } catch {/* */}
  };

  const handleAddNote = async () => {
    if (!selectedTask || !newNote.trim()) return;
    const note: TaskNote = {
      id: Date.now().toString(),
      text: newNote.trim(),
      createdAt: Timestamp.now(),
      createdBy: 'current_user',
    };
    try {
      await updateTask(selectedTask.id, { notes: [...selectedTask.notes, note] });
      setNewNote('');
      toast({ title: 'Added', description: 'Note saved.' });
    } catch {/* */}
  };

  /*──────────────────── 2.3 الأعمدة والخانات */
  const getColumnHeaders = () => {
    const today = new Date();
    switch (plan.frequency) {
      case 'Daily': {
        const startWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(startWeek);
          d.setDate(startWeek.getDate() + i);
          return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.getDate() };
        });
      }
      case 'Weekly':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case 'Monthly':
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

  const findTaskForSlot = (desc: string, slot: number) =>
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
  const progress = tasks.length ? Math.round((tasks.filter((t) => t.status === 'Completed').length / tasks.length) * 100) : 0;

  /*──────────────────── 3) واجهة المستخدم */
  if (!plan || isLoading)
    return (
      <div className="flex-center h-full p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading…</span>
      </div>
    );
const isPage = !!planId && !initialPlan;
  return (
    <div className={`${isPage ? 'container mx-auto py-6' : ''} space-y-6 h-full flex flex-col`}>
      {isPage && (
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{plan.planName}</h1>
          <Button asChild variant="outline">
            <Link to="/maintenance-management">Back</Link>
          </Button>
        </div>
      )}
      {/* شريط التقدم العام */
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Maintenance Progress</CardTitle>
            <Badge variant="outline" className="px-3 py-1">
              {tasks.filter((t) => t.status === 'Completed').length} / {tasks.length} Completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>



        /* جدول المهام */}
      <div className="border rounded-lg overflow-auto flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 w-[300px] max-w-[300px] bg-background">Task</TableHead>
              {headers.map((h, i) => (
                <TableHead key={i} className="text-center whitespace-nowrap min-w-[200px]">
                  {typeof h === 'string' ? h : `${h.day} ${h.date}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(plan.tasks || []).map((desc, r) => (
              <TableRow key={r}>
                {/* وصف المهمة */}
                <TableCell className="sticky left-0 z-10 w-[300px] max-w-[300px] bg-background">
                  <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all p-2 font-medium">
                    {desc}
                  </div>
                </TableCell>
                {headers.map((_, c) => {
                  const task = findTaskForSlot(desc, c);
                  return (
                    <TableCell key={c} className="text-center p-2">
                      {task ? (
                        <Card className="min-w-[180px]">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex justify-center">
                              <TaskStatusBadge status={task.status} />
                            </div>
                            <div className="flex justify-center gap-1">
                              <Button size="sm" variant={task.status === 'In Progress' ? 'default' : 'outline'} onClick={() => handleStatusUpdate(task, 'In Progress')} className="h-8 w-8 p-0" title="Start">
                                <PlayCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant={task.status === 'Completed' ? 'default' : 'outline'} onClick={() => handleStatusUpdate(task, 'Completed')} className="h-8 w-8 p-0" title="Complete">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant={task.status === 'Skipped' ? 'destructive' : 'outline'} onClick={() => handleStatusUpdate(task, 'Skipped')} className="h-8 w-8 p-0" title="Skip">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                            <TaskTimerComponent timer={task.timer} onTimerUpdate={(t) => handleTimerUpdate(task, t)} />
                            {task.status === 'Completed' && (
                              <div>
                                <Label className="text-xs">Quality:</Label>
                                <StarRating rating={task.qualityRating ?? 0} onRatingChange={(r) => handleQualityRatingUpdate(task, r)} />
                              </div>
                            )}
                            <div className="flex justify-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Details" onClick={() => {
                                setSelectedTask(task);
                                setShowTaskDetails(true);
                              }}>
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Attach Image">
                                <Camera className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex justify-center gap-1">
                              {!!task.notes.length && <Badge variant="secondary" className="text-xs">{task.notes.length} Note(s)</Badge>}
                              {!!task.timer.totalDuration && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.floor(task.timer.totalDuration / 60)}:{(task.timer.totalDuration % 60).toString().padStart(2, '0')}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <span className="text-gray-400">-</span>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Period Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Add notes for this period…" value={periodNotes} onChange={(e) => setPeriodNotes(e.target.value)} className="min-h-[100px]" />
        </CardContent>
      </Card>

      {/* تفاصيل المهمة */}
      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>View & edit detailed info.</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Task</Label>
                  <p className="mt-1 p-2 border rounded-md bg-gray-50 whitespace-pre-wrap break-words">{selectedTask.taskDescription}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1"><TaskStatusBadge status={selectedTask.status} /></div>
                </div>
                <div>
                  <Label>Time Spent</Label>
                  <p className="mt-1 p-2 border rounded-md bg-gray-50">
                    {Math.floor(selectedTask.timer.totalDuration / 60)}:{(selectedTask.timer.totalDuration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div>
                  <Label>Quality</Label>
                  <StarRating rating={selectedTask.qualityRating ?? 0} onRatingChange={(r) => handleQualityRatingUpdate(selectedTask, r)} />
                </div>
              </div>
              {/* الملاحظات */}
              <div className="space-y-4">
                <Label className="font-semibold">Notes</Label>
                <div className="space-y-2">
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write your note here…" />
                  <Button size="sm" disabled={!newNote.trim()} onClick={handleAddNote}>Add Note</Button>
                </div>
                {selectedTask.notes.length > 0 && (
                  <div className="space-y-2">
                    {selectedTask.notes.map((n) => (
                      <Card key={n.id}>
                        <CardContent className="p-3 space-y-1">
                          <p className="text-sm whitespace-pre-wrap break-words">{n.text}</p>
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>By: {n.createdBy}</span>
                            <span>{n.createdAt.toDate().toLocaleString('en-US')}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              {/* تغيير الحالة */}
              <div className="space-y-2">
                <Label className="font-semibold">Change Status</Label>
                <div className="flex flex-wrap gap-2">
                  {(['Pending','In Progress','Completed','Partially Done','Needs Review','Skipped','Failed'] as TaskStatus[]).map((st) => (
                    <Button key={st} size="sm" variant={selectedTask.status === st ? 'default' : 'outline'} onClick={() => handleStatusUpdate(selectedTask, st)}>
                      {st}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowTaskDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default MaintenanceChecklist;