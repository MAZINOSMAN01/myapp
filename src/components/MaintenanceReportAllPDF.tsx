// src/components/MaintenanceChecklist.tsx
// نسخة متقدمة مع جميع الخصائص المحسنة

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase/config';

import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
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
  Upload,
  RotateCcw,
  Save,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { MaintenanceReportPDF } from '@/components/MaintenanceReportPDF';

// استيراد الأنواع المحدثة
import type { 
  MaintenancePlan, 
  AdvancedMaintenanceTask,
  TaskStatus,
  QualityRating,
  TaskTimer,
  TaskNote,
  Priority,
  PerformanceStats
} from '@/types/maintenance';

interface Props {
  plan: MaintenancePlan;
}



/* ═══════════════════════════════════════════════════════════════
 *                    HELPER COMPONENTS
 * ═══════════════════════════════════════════════════════════════ */

/** مكون تقييم الجودة بالنجوم */
const StarRating: React.FC<{
  rating: QualityRating;
  onRatingChange: (rating: Exclude<QualityRating, 0>) => void;
  readonly?: boolean;
}> = ({ rating, onRatingChange, readonly = false }) => {
  return (
    <div className="flex gap-1" title={`Quality Rating: ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Button
          key={star}
          variant="ghost"
          size="sm"
          className="p-0 h-6 w-6 hover:scale-110 transition-transform"
          onClick={() => !readonly && onRatingChange(star as Exclude<QualityRating, 0>)}
          disabled={readonly}
        >
          <Star
            className={`h-4 w-4 transition-colors ${
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



/** مكون مؤقت المهام */
const TaskTimerComponent: React.FC<{
  timer: TaskTimer;
  onTimerUpdate: (timer: TaskTimer) => void;
  taskId: string;
}> = ({ timer, onTimerUpdate, taskId }) => {
  const [isRunning, setIsRunning] = useState(!timer.isPaused && !!timer.startTime && !timer.endTime);
  const [currentDuration, setCurrentDuration] = useState(timer.totalDuration);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isRunning && timer.startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const startTime = timer.startTime!.toDate();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 60000);
        setCurrentDuration(elapsed - timer.pausedDuration);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timer.startTime, timer.pausedDuration]);

  const startTimer = () => {
    const newTimer = {
      ...timer,
      startTime: timer.startTime || Timestamp.now(),
      isPaused: false,
    };
    setIsRunning(true);
    onTimerUpdate(newTimer);
  };

  const pauseTimer = () => {
    const newTimer = {
      ...timer,
      isPaused: true,
      totalDuration: currentDuration,
    };
    setIsRunning(false);
    onTimerUpdate(newTimer);
  };

  const stopTimer = () => {
    const newTimer = {
      ...timer,
      endTime: Timestamp.now(),
      totalDuration: currentDuration,
      isPaused: false,
    };
    setIsRunning(false);
    onTimerUpdate(newTimer);
  };

  const resetTimer = () => {
    const newTimer = {
      totalDuration: 0,
      isPaused: false,
      pausedDuration: 0,
    };
    setIsRunning(false);
    setCurrentDuration(0);
    onTimerUpdate(newTimer);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
        <Timer className="h-4 w-4" />
        <span>{formatDuration(currentDuration)}</span>
      </div>
      <div className="flex gap-1">
        {!isRunning && !timer.endTime && (
          <Button size="sm" variant="outline" onClick={startTimer} className="h-7 w-7 p-0" title="Start Timer">
            <Play className="h-3 w-3" />
          </Button>
        )}
        {isRunning && (
          <Button size="sm" variant="outline" onClick={pauseTimer} className="h-7 w-7 p-0" title="Pause Timer">
            <Pause className="h-3 w-3" />
          </Button>
        )}
        {(isRunning || timer.isPaused) && !timer.endTime && (
          <Button size="sm" variant="default" onClick={stopTimer} className="h-7 w-7 p-0" title="Stop Timer">
            <CheckCircle className="h-3 w-3" />
          </Button>
        )}
        {currentDuration > 0 && (
          <Button size="sm" variant="outline" onClick={resetTimer} className="h-7 w-7 p-0" title="Reset Timer">
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

/** مكون شارة حالة المهمة */
const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'Pending':
        return { color: 'bg-gray-100 text-gray-800', icon: Clock };
      case 'In Progress':
        return { color: 'bg-blue-100 text-blue-800', icon: PlayCircle };
      case 'Completed':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'Partially Done':
        return { color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle2 };
      case 'Needs Review':
        return { color: 'bg-orange-100 text-orange-800', icon: Eye };
      case 'Skipped':
        return { color: 'bg-gray-100 text-gray-600', icon: XCircle };
      case 'Failed':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <IconComponent className="h-3 w-3" />
      {status}
    </Badge>
  );
};

/** مكون شارة الأولوية */
const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const getPriorityConfig = (priority: Priority) => {
    switch (priority) {
      case 'Low':
        return { color: 'bg-green-100 text-green-800', icon: '🟢' };
      case 'Medium':
        return { color: 'bg-yellow-100 text-yellow-800', icon: '🟡' };
      case 'High':
        return { color: 'bg-orange-100 text-orange-800', icon: '🟠' };
      case 'Critical':
        return { color: 'bg-red-100 text-red-800', icon: '🔴' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: '⚪' };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <span>{config.icon}</span>
      {priority}
    </Badge>
  );
};

/* ═══════════════════════════════════════════════════════════════
 *                    MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════ */

export function MaintenanceChecklist({ plan }: Props) {
  const [tasks, setTasks] = useState<AdvancedMaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedTask, setSelectedTask] = useState<AdvancedMaintenanceTask | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const { toast } = useToast();
  // استعلام المهام من قاعدة البيانات
  useEffect(() => {
    if (!plan?.id) return;

    setIsLoading(true);
    const today = new Date();
    let startPeriod: Date, endPeriod: Date;

    // تحديد الفترة الزمنية بناءً على تكرار الخطة
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
      where('dueDate', '<=', Timestamp.fromDate(endPeriod))
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const fetchedTasks = snap.docs.map((d) => {
          const data = d.data();
          
          // ترحيل البيانات القديمة إلى البنية الجديدة
          const advancedTask: AdvancedMaintenanceTask = {
            id: d.id,
            planId: data.planId || plan.id,
            assetId: data.assetId || '',
            taskDescription: data.taskDescription || '',
            dueDate: data.dueDate,
            status: data.status || 'Pending',
            type: data.type || 'Preventive',
            qualityRating: data.qualityRating || undefined,
            timer: data.timer || {
              totalDuration: 0,
              isPaused: false,
              pausedDuration: 0,
            },
            priority: data.priority || 'Medium',
            estimatedDuration: data.estimatedDuration || undefined,
            notes: data.notes || [],
            assignedTo: data.assignedTo || undefined,
            assignedToName: data.assignedToName || undefined,
            completedBy: data.completedBy || undefined,
            completedAt: data.completedAt || undefined,
            cost: data.cost || undefined,
            actualDuration: data.actualDuration || undefined,
            createdAt: data.createdAt || Timestamp.now(),
            lastModified: data.lastModified || Timestamp.now(),
            createdBy: data.createdBy || 'system',
            completionNotes: data.completionNotes || undefined,
            attachments: data.attachments || [],
          };
          
          return advancedTask;
        });
        
        setTasks(fetchedTasks);
        calculatePerformanceStats(fetchedTasks);
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
      }
    );

    return () => unsubscribe();
  }, [plan.id, plan.frequency, toast]);

  // حساب إحصائيات الأداء
  const calculatePerformanceStats = (tasks: AdvancedMaintenanceTask[]) => {
    const stats: PerformanceStats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'Completed').length,
      pendingTasks: tasks.filter(t => t.status === 'Pending').length,
      overdueTasks: tasks.filter(t => t.dueDate.toDate() < new Date() && t.status !== 'Completed').length,
      averageCompletionTime: 0,
      averageQualityRating: 0,
      totalCost: 0,
      weeklyCompletion: [],
      monthlyCompletion: [],
      tasksByStatus: {} as Record<TaskStatus, number>,
      tasksByPriority: {} as Record<Priority, number>,
      tasksByAsset: {},
    };

    // حساب متوسط الوقت والجودة
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    if (completedTasks.length > 0) {
      stats.averageCompletionTime = completedTasks.reduce((sum, task) => sum + (task.timer.totalDuration || 0), 0) / completedTasks.length;
      stats.averageQualityRating = completedTasks.reduce((sum, task) => sum + (task.qualityRating || 0), 0) / completedTasks.length;
      stats.totalCost = completedTasks.reduce((sum, task) => sum + (task.cost || 0), 0);
    }

    // توزيع المهام حسب الحالة
    (['Pending', 'In Progress', 'Completed', 'Partially Done', 'Needs Review', 'Skipped', 'Failed'] as TaskStatus[]).forEach(status => {
      stats.tasksByStatus[status] = tasks.filter(t => t.status === status).length;
    });

    // توزيع المهام حسب الأولوية
    (['Low', 'Medium', 'High', 'Critical'] as Priority[]).forEach(priority => {
      stats.tasksByPriority[priority] = tasks.filter(t => t.priority === priority).length;
    });

    setPerformanceStats(stats);
  };

  // تحديث حالة المهمة
  const handleStatusUpdate = async (task: AdvancedMaintenanceTask, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    
    try {
      const updateData: any = {
        status: newStatus,
        lastModified: Timestamp.now(),
      };
      
      if (newStatus === 'Completed') {
        updateData.completedBy = 'current_user';
        updateData.completedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'maintenance_tasks', task.id), updateData);
      
      toast({
        title: 'Update Successful',
        description: `Task status updated to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Status update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status.',
        variant: 'destructive',
      });
    }
  };

  // تحديث تقييم الجودة
  const handleQualityRatingUpdate = async (task: AdvancedMaintenanceTask, rating: Exclude<QualityRating, 0>) => {
    try {
      const updateData = {
        qualityRating: rating,
        lastModified: Timestamp.now(),
      };

      await updateDoc(doc(db, 'maintenance_tasks', task.id), updateData);
      
      toast({
        title: 'Rating Updated',
        description: `Quality rating updated to ${rating} stars.`,
      });
    } catch (error) {
      console.error('Quality rating update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quality rating.',
        variant: 'destructive',
      });
    }
  };

  // تحديث المؤقت
  const handleTimerUpdate = async (task: AdvancedMaintenanceTask, timer: TaskTimer) => {
    try {
      const updateData = {
        timer,
        lastModified: Timestamp.now(),
      };

      await updateDoc(doc(db, 'maintenance_tasks', task.id), updateData);
    } catch (error) {
      console.error('Timer update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timer.',
        variant: 'destructive',
      });
    }
  };

  // إضافة ملاحظة جديدة
  const handleAddNote = async () => {
    if (!selectedTask || !newNote.trim()) return;

    try {
      const note: TaskNote = {
        id: Date.now().toString(),
        text: newNote.trim(),
        createdAt: Timestamp.now(),
        createdBy: 'current_user',
      };

      const updatedNotes = [...selectedTask.notes, note];
      
      await updateDoc(doc(db, 'maintenance_tasks', selectedTask.id), {
        notes: updatedNotes,
        lastModified: Timestamp.now(),
      });

      setNewNote('');
      toast({
        title: 'Added',
        description: 'Note added successfully.',
      });
    } catch (error) {
      console.error('Add note error:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note.',
        variant: 'destructive',
      });
    }
  };

  // الحصول على عناوين الأعمدة
  const getColumnHeaders = () => {
    const today = new Date();
    switch (plan.frequency) {
      case 'Daily': {
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
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

  // العثور على المهمة المناسبة للفترة الزمنية
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

  // حساب التقدم الإجمالي
  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // حفظ الملاحظات
  const handleSaveNotes = async () => {
    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some notes before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const noteData = {
        planId: plan.id,
        notes: notes.trim(),
        createdAt: Timestamp.now(),
        createdBy: 'current_user',
        period: selectedPeriod,
      };

      await addDoc(collection(db, 'maintenance_notes'), noteData);
      
      setNotes('');
      
      toast({
        title: 'Success',
        description: 'Notes saved successfully.',
      });
    } catch (error) {
      console.error('Save notes error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes.',
        variant: 'destructive',
      });
    }
  };

  // إنشاء تقرير الأداء
  const generatePerformanceReport = async () => {
    if (!performanceStats) {
      toast({
        title: 'Error',
        description: 'Performance statistics are not available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const currentDate = new Date();
      const report = {
        title: `Performance Report - ${plan.planName}`,
        generatedAt: Timestamp.now(),
        planId: plan.id,
        planName: plan.planName,
        dateRange: {
          start: currentDate,
          end: currentDate,
        },
        stats: performanceStats,
        recommendations: generateRecommendations(performanceStats),
        generatedBy: 'current_user',
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'Completed').length,
        progress: calculateProgress(),
      };

      await addDoc(collection(db, 'performance_reports'), report);
      
      toast({
        title: 'Report Generated Successfully',
        description: `Performance report for ${plan.planName} has been created and saved.`,
      });
    } catch (error) {
      console.error('Generate report error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate performance report.',
        variant: 'destructive',
      });
    }
  };

  // توليد التوصيات
  const generateRecommendations = (stats: PerformanceStats): string[] => {
    const recommendations: string[] = [];
    
    if (stats.overdueTasks > 0) {
      recommendations.push(`${stats.overdueTasks} tasks are overdue. Consider reviewing task scheduling.`);
    }
    
    if (stats.averageQualityRating < 3) {
      recommendations.push('Quality ratings are below average. Additional training may be needed.');
    }
    
    if (stats.averageCompletionTime > 120) {
      recommendations.push('Tasks are taking longer than expected. Review resource allocation.');
    }
    
    return recommendations;
  };

  const headers = getColumnHeaders();
  const progress = calculateProgress();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading Advanced Checklist...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* شريط الإحصائيات والتقدم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg. Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceStats ? Math.round(performanceStats.averageCompletionTime) : 0}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per task</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Quality Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceStats ? performanceStats.averageQualityRating.toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average stars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {performanceStats ? performanceStats.overdueTasks : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generatePerformanceReport}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
          >
            <FileText className="h-4 w-4" />
            Generate Performance Report
          </Button>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {tasks.filter(t => t.status === 'Completed').length} / {tasks.length} Tasks
        </Badge>
      </div>

      {/* جدول المهام المتقدم */}
      <div className="border rounded-lg overflow-auto flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 w-[300px] max-w-[300px] bg-background">
                Task Description
              </TableHead>
              {headers.map((h, i) => (
                <TableHead key={i} className="text-center whitespace-nowrap min-w-[250px]">
                  {typeof h === 'string' ? h : `${h.day} ${h.date}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {(plan.tasks || []).map((desc, r) => (
              <TableRow key={r}>
                <TableCell className="sticky left-0 z-10 w-[300px] max-w-[300px] bg-background">
                  <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all p-2">
                    <div className="font-medium">{desc}</div>
                  </div>
                </TableCell>

                {headers.map((_, c) => {
                  const task = findTaskForTimeSlot(desc, c);
                  return (
                    <TableCell key={c} className="text-center p-2">
                      {task ? (
                        <Card className="w-full min-w-[230px]">
                          <CardContent className="p-4 space-y-3">
                            {/* معلومات المهمة الأساسية */}
                            <div className="flex justify-between items-start">
                              <TaskStatusBadge status={task.status} />
                              <PriorityBadge priority={task.priority} />
                            </div>

                            {/* أزرار التحكم في الحالة */}
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant={task.status === 'In Progress' ? 'default' : 'outline'}
                                onClick={() => handleStatusUpdate(task, 'In Progress')}
                                className="h-8 w-8 p-0"
                                title="Start Task"
                              >
                                <PlayCircle className="h-4 w-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant={task.status === 'Completed' ? 'default' : 'outline'}
                                onClick={() => handleStatusUpdate(task, 'Completed')}
                                className="h-8 w-8 p-0"
                                title="Complete Task"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant={task.status === 'Needs Review' ? 'default' : 'outline'}
                                onClick={() => handleStatusUpdate(task, 'Needs Review')}
                                className="h-8 w-8 p-0"
                                title="Needs Review"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant={task.status === 'Skipped' ? 'destructive' : 'outline'}
                                onClick={() => handleStatusUpdate(task, 'Skipped')}
                                className="h-8 w-8 p-0"
                                title="Skip Task"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* مؤقت المهمة */}
                            <TaskTimerComponent
                              timer={task.timer}
                              onTimerUpdate={(timer) => handleTimerUpdate(task, timer)}
                              taskId={task.id}
                            />

                            {/* تقييم الجودة */}
                            {task.status === 'Completed' && (
                              <div className="space-y-1">
                                <Label className="text-xs">Quality Rating:</Label>
                                <StarRating
                                  rating={task.qualityRating || 0}
                                  onRatingChange={(rating) => handleQualityRatingUpdate(task, rating)}
                                />
                              </div>
                            )}

                            {/* معلومات إضافية */}
                            <div className="space-y-2">
                              {task.assignedToName && (
                                <Badge variant="secondary" className="text-xs">
                                  👤 {task.assignedToName}
                                </Badge>
                              )}
                              {task.estimatedDuration && (
                                <Badge variant="secondary" className="text-xs">
                                  ⏱️ {task.estimatedDuration}m est.
                                </Badge>
                              )}
                              {task.cost && (
                                <Badge variant="secondary" className="text-xs">
                                  💰 ${task.cost}
                                </Badge>
                              )}
                            </div>

                            {/* أزرار إضافية */}
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowTaskDetails(true);
                                }}
                                className="h-7 w-7 p-0"
                                title="View Details"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                title="Attach Image"
                              >
                                <Camera className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                title="Upload File"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* مؤشرات إضافية */}
                            <div className="flex justify-center gap-1 flex-wrap">
                              {task.notes.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  📝 {task.notes.length}
                                </Badge>
                              )}
                              {task.attachments && task.attachments.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  📎 {task.attachments.length}
                                </Badge>
                              )}
                              {task.timer.totalDuration > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  ⏱️ {Math.floor(task.timer.totalDuration / 60)}h {task.timer.totalDuration % 60}m
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
          <Textarea
            placeholder="Add any relevant notes for this period..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end mt-2">
            <Button 
              size="sm" 
              className="flex items-center gap-2"
              onClick={handleSaveNotes}
            >
              <Save className="h-4 w-4" />
              Save Notes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* نافذة تفاصيل المهمة */}
      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advanced Task Details</DialogTitle>
            <DialogDescription>
              Complete task information and management interface
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              {/* معلومات عامة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Task Description</Label>
                  <p className="mt-1 p-2 border rounded-md bg-gray-50">{selectedTask.taskDescription}</p>
                </div>
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  <div className="flex items-center gap-2">
                    <TaskStatusBadge status={selectedTask.status} />
                    <PriorityBadge priority={selectedTask.priority} />
                  </div>
                </div>
                <div>
                  <Label>Time Tracking</Label>
                  <div className="mt-1 p-2 border rounded-md bg-gray-50">
                    <div className="flex justify-between">
                      <span>Total Time:</span>
                      <span className="font-mono">
                        {Math.floor(selectedTask.timer.totalDuration / 60)}:
                        {(selectedTask.timer.totalDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    {selectedTask.estimatedDuration && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Estimated:</span>
                        <span>{selectedTask.estimatedDuration}m</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Quality Assessment</Label>
                  <div className="mt-1 p-2 border rounded-md bg-gray-50">
                    <StarRating
                      rating={selectedTask.qualityRating || 0}
                      onRatingChange={(rating) => handleQualityRatingUpdate(selectedTask, rating)}
                    />
                  </div>
                </div>
              </div>

              {/* معلومات التكليف والتكلفة */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Assigned To</Label>
                  <p className="mt-1 p-2 border rounded-md bg-gray-50">
                    {selectedTask.assignedToName || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <Label>Completed By</Label>
                  <p className="mt-1 p-2 border rounded-md bg-gray-50">
                    {selectedTask.completedBy || 'Not completed'}
                  </p>
                </div>
                <div>
                  <Label>Cost</Label>
                  <p className="mt-1 p-2 border rounded-md bg-gray-50">
                    {selectedTask.cost ? `$${selectedTask.cost}` : 'No cost recorded'}
                  </p>
                </div>
              </div>

              {/* الملاحظات */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Task Notes</Label>
                
                {/* إضافة ملاحظة جديدة */}
                <div className="space-y-2">
                  <Textarea 
                    placeholder="Add a detailed note about this task..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={handleAddNote} 
                    size="sm" 
                    disabled={!newNote.trim()}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Add Note
                  </Button>
                </div>
                
                {/* الملاحظات الموجودة */}
                {selectedTask.notes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Previous Notes ({selectedTask.notes.length}):</Label>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {selectedTask.notes.map((note) => (
                        <Card key={note.id}>
                          <CardContent className="p-3">
                            <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                              <span>👤 {note.createdBy}</span>
                              <span>🕐 {note.createdAt.toDate().toLocaleString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* تغيير حالة المهمة */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Change Task Status</Label>
                <div className="flex flex-wrap gap-2">
                  {(['Pending', 'In Progress', 'Completed', 'Partially Done', 'Needs Review', 'Skipped', 'Failed'] as TaskStatus[]).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedTask.status === status ? 'default' : 'outline'}
                      onClick={() => handleStatusUpdate(selectedTask, status)}
                      className="flex items-center gap-2"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              {/* معلومات التتبع */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm text-gray-500">Created</Label>
                  <p className="text-sm">{selectedTask.createdAt.toDate().toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Last Modified</Label>
                  <p className="text-sm">{selectedTask.lastModified.toDate().toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            {selectedTask && (
              <PDFDownloadLink
                document={
                  <MaintenanceReportPDF 
                    task={selectedTask} 
                    assetName={plan.assetName} 
                    planName={plan.planName}
                  />
                }
                fileName={`Maintenance-Report-${selectedTask.id}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="secondary" disabled={loading}>{loading ? 'Generating...' : 'Download PDF Report'}</Button>
                )}
              </PDFDownloadLink>
            )}


            <Button variant="outline" onClick={() => setShowTaskDetails(false)}>
              Close
            </Button>
            
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
