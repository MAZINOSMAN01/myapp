// src/components/MaintenanceManagement.tsx
// نسخة محسنة مع دعم المهام المتقدمة ونظام التوليد المحدث

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/firebase/config';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  getDocs, 
  writeBatch, 
  Timestamp, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { DataTable } from './DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PlusCircle, 
  SlidersHorizontal, 
  ShieldCheck, 
  Wrench, 
  RefreshCw,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Download,
  Upload,
} from 'lucide-react';
import { CreateMaintenancePlan } from './CreateMaintenancePlan';

// استيراد الأنواع المحدثة
import type { 
  Asset, 
  NewMaintenancePlan,
  MaintenancePlan,
  AdvancedMaintenanceTask,
  TaskStatus,
  Priority,
  PerformanceStats,
} from '@/types/maintenance';

/* ═══════════════════════════════════════════════════════════════
 *                    INTERFACES & TYPES
 * ═══════════════════════════════════════════════════════════════ */

interface EnhancedMaintenanceTask extends AdvancedMaintenanceTask {
  assetName?: string;
  planName?: string;
  isOverdue?: boolean;
}

interface TaskFilters {
  status: TaskStatus | 'ALL' | 'Overdue';
  priority: Priority | 'ALL';
  type: 'Preventive' | 'Corrective' | 'ALL';
  assetId: string | 'ALL';
  assignedTo: string | 'ALL';
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface CorrectiveTaskForm {
  assetId: string;
  taskDescription: string;
  priority: Priority;
  dueDate: string;
  assignedTo?: string;
  estimatedDuration?: number;
  cost?: number;
  notes?: string;
}

/* ═══════════════════════════════════════════════════════════════
 *                    HELPER COMPONENTS
 * ═══════════════════════════════════════════════════════════════ */

/** مكون إحصائيات الأداء */
const PerformanceStatsCard: React.FC<{ stats: PerformanceStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold">{stats.totalTasks}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
              <p className="text-xs text-gray-500">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completion rate
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
              <p className="text-xs text-gray-500">Need immediate attention</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Quality</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.averageQualityRating.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Out of 5 stars</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
 *                    MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════ */

export function MaintenanceManagement() {
  /* ═══════════════════════════════════════════════════════════════
   *                         STATE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════ */
  
  // البيانات الأساسية
  const [tasks, setTasks] = useState<EnhancedMaintenanceTask[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);

  // حالات النوافذ والحوارات
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [isCorrectiveFormOpen, setIsCorrectiveFormOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // فلاتر البحث
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'ALL',
    priority: 'ALL',
    type: 'ALL',
    assetId: 'ALL',
    assignedTo: 'ALL',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // نموذج المهمة التصحيحية
  const [correctiveFormData, setCorrectiveFormData] = useState<CorrectiveTaskForm>({
    assetId: '',
    taskDescription: '',
    priority: 'Medium',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedDuration: 60,
  });

  const { toast } = useToast();

  /* ═══════════════════════════════════════════════════════════════
   *                         DATA LOADING
   * ═══════════════════════════════════════════════════════════════ */

  // تحميل المهام
  useEffect(() => {
    setIsLoading(true);
    
    const q = query(
      collection(db, 'maintenance_tasks'),
      where('dueDate', '>=', Timestamp.fromDate(filters.dateRange.start)),
      where('dueDate', '<=', Timestamp.fromDate(filters.dateRange.end)),
      orderBy('dueDate', 'desc'),
      limit(1000)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const fetchedTasks = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            planId: data.planId || '',
            assetId: data.assetId || '',
            taskDescription: data.taskDescription || '',
            dueDate: data.dueDate,
            status: data.status || 'Pending',
            type: data.type || 'Preventive',
            qualityRating: data.qualityRating,
            timer: data.timer || { totalDuration: 0, isPaused: false, pausedDuration: 0 },
            priority: data.priority || 'Medium',
            estimatedDuration: data.estimatedDuration,
            notes: data.notes || [],
            assignedTo: data.assignedTo,
            assignedToName: data.assignedToName,
            completedBy: data.completedBy,
            completedAt: data.completedAt,
            cost: data.cost,
            actualDuration: data.actualDuration,
            createdAt: data.createdAt || Timestamp.now(),
            lastModified: data.lastModified || Timestamp.now(),
            createdBy: data.createdBy || 'system',
            completionNotes: data.completionNotes,
            attachments: data.attachments || [],
            
            // حقول محسوبة
            isOverdue: data.dueDate.toDate() < new Date() && data.status !== 'Completed',
          } as EnhancedMaintenanceTask;
        });

        // إضافة أسماء الأصول والخطط
        const enhancedTasks = await enhanceTasksWithMetadata(fetchedTasks);
        setTasks(enhancedTasks);
        calculatePerformanceStats(enhancedTasks);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load maintenance tasks.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters.dateRange, toast]);

  // تحميل الأصول
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'assets'), (snapshot) => {
      const fetchedAssets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Asset, 'id'>),
      }));
      setAssets(fetchedAssets);
    });

    return () => unsubscribe();
  }, []);

  // تحميل المستخدمين
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const fetchedUsers = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.data().email || doc.id,
        }));
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, []);

  /* ═══════════════════════════════════════════════════════════════
   *                         HELPER FUNCTIONS
   * ═══════════════════════════════════════════════════════════════ */

  // إضافة البيانات الوصفية للمهام
  const enhanceTasksWithMetadata = async (tasks: EnhancedMaintenanceTask[]): Promise<EnhancedMaintenanceTask[]> => {
    try {
      // جلب معلومات الخطط
      const plansSnapshot = await getDocs(collection(db, 'maintenance_plans'));
      const plansMap = new Map();
      plansSnapshot.docs.forEach(doc => {
        plansMap.set(doc.id, doc.data().planName);
      });

      return tasks.map(task => ({
        ...task,
        assetName: assets.find(asset => asset.id === task.assetId)?.name || 'Unknown Asset',
        planName: plansMap.get(task.planId) || 'Direct Task',
      }));
    } catch (error) {
      console.error('Error enhancing tasks:', error);
      return tasks;
    }
  };

  // حساب إحصائيات الأداء
  const calculatePerformanceStats = (tasks: EnhancedMaintenanceTask[]) => {
    const stats: PerformanceStats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'Completed').length,
      pendingTasks: tasks.filter(t => t.status === 'Pending').length,
      overdueTasks: tasks.filter(t => t.isOverdue).length,
      averageCompletionTime: 0,
      averageQualityRating: 0,
      totalCost: 0,
      weeklyCompletion: [],
      monthlyCompletion: [],
      tasksByStatus: {} as Record<TaskStatus, number>,
      tasksByPriority: {} as Record<Priority, number>,
      tasksByAsset: {},
    };

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

  /* ═══════════════════════════════════════════════════════════════
   *                         COMPUTED VALUES
   * ═══════════════════════════════════════════════════════════════ */

  // المهام المفلترة
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // فلتر الحالة
      if (filters.status !== 'ALL') {
        if (filters.status === 'Overdue') {
          if (!task.isOverdue) return false;
        } else if (task.status !== filters.status) {
          return false;
        }
      }

      // فلتر الأولوية
      if (filters.priority !== 'ALL' && task.priority !== filters.priority) {
        return false;
      }

      // فلتر النوع
      if (filters.type !== 'ALL' && task.type !== filters.type) {
        return false;
      }

      // فلتر الأصل
      if (filters.assetId !== 'ALL' && task.assetId !== filters.assetId) {
        return false;
      }

      // فلتر المكلف
      if (filters.assignedTo !== 'ALL' && task.assignedTo !== filters.assignedTo) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // أعمدة الجدول
  const columns: ColumnDef<EnhancedMaintenanceTask>[] = [
    {
      accessorKey: 'taskDescription',
      header: 'Task Description',
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          <div className="font-medium truncate">{row.original.taskDescription}</div>
          <div className="text-sm text-gray-500">{row.original.planName}</div>
        </div>
      ),
    },
    {
      accessorKey: 'assetName',
      header: 'Asset',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.assetName}</div>
          {row.original.location && (
            <div className="text-sm text-gray-500">{row.original.location}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'Preventive' ? 'default' : 'secondary'}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const isOverdue = row.original.isOverdue;
        
        const statusColors = {
          'Pending': 'bg-gray-100 text-gray-800',
          'In Progress': 'bg-blue-100 text-blue-800',
          'Completed': 'bg-green-100 text-green-800',
          'Partially Done': 'bg-yellow-100 text-yellow-800',
          'Needs Review': 'bg-orange-100 text-orange-800',
          'Skipped': 'bg-gray-100 text-gray-600',
          'Failed': 'bg-red-100 text-red-800',
        };

        return (
          <div className="flex flex-col gap-1">
            <Badge className={statusColors[status]}>{status}</Badge>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">Overdue</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.original.priority;
        const priorityColors = {
          'Low': 'bg-green-100 text-green-800',
          'Medium': 'bg-yellow-100 text-yellow-800',
          'High': 'bg-orange-100 text-orange-800',
          'Critical': 'bg-red-100 text-red-800',
        };

        return <Badge className={priorityColors[priority]}>{priority}</Badge>;
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.dueDate.toDate().toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: 'assignedToName',
      header: 'Assigned To',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.assignedToName || 'Unassigned'}
        </div>
      ),
    },
    {
      accessorKey: 'timer.totalDuration',
      header: 'Duration',
      cell: ({ row }) => {
        const duration = row.original.timer.totalDuration;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return (
          <div className="text-sm font-mono">
            {hours > 0 ? `${hours}h ` : ''}{minutes}m
          </div>
        );
      },
    },
    {
      accessorKey: 'qualityRating',
      header: 'Quality',
      cell: ({ row }) => {
        const rating = row.original.qualityRating;
        if (!rating) return <span className="text-gray-400">-</span>;
        
        return (
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">{'★'.repeat(rating)}</span>
            <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
            <span className="text-xs ml-1">{rating}/5</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: ({ row }) => {
        const cost = row.original.cost;
        return cost ? `$${cost.toFixed(2)}` : '-';
      },
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
   *                         EVENT HANDLERS
   * ═══════════════════════════════════════════════════════════════ */

  // توليد المهام الوقائية
  const handleGeneratePreventiveTasks = async () => {
    setIsGenerating(true);
    
    try {
      // استدعاء Cloud Function للتوليد المتقدم
      const response = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'advanced_weekly' }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success ✅',
          description: `Generated ${result.tasksGenerated} new advanced preventive tasks.`,
        });
      } else {
        throw new Error('Failed to generate tasks');
      }
    } catch (error) {
      // Fallback: استخدام التوليد المحلي
      await generateTasksLocally();
    } finally {
      setIsGenerating(false);
    }
  };

  // التوليد المحلي كـ fallback
  const generateTasksLocally = async () => {
    try {
      const plansSnapshot = await getDocs(collection(db, 'maintenance_plans'));
      const plans = plansSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as MaintenancePlan[];
      
      const batch = writeBatch(db);
      let tasksGeneratedCount = 0;
      const now = new Date();

      plans.forEach(plan => {
        if (plan.isActive === false) return;

        const lastGeneratedDate = plan.lastGenerated?.toDate() || new Date(0);
        let nextDueDate = new Date(Math.max(lastGeneratedDate.getTime(), plan.firstDueDate.toDate().getTime()));

        // حساب التاريخ التالي
        switch (plan.frequency) {
          case 'Daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
          case 'Weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
          case 'Monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
          case 'Quarterly': nextDueDate.setMonth(nextDueDate.getMonth() + 3); break;
          case 'Annually': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
          default: return;
        }

        if (now >= nextDueDate) {
          plan.tasks?.forEach(taskDescription => {
            const newTaskRef = doc(collection(db, 'maintenance_tasks'));
            batch.set(newTaskRef, {
              planId: plan.id,
              assetId: plan.assetId,
              taskDescription,
              type: 'Preventive',
              status: 'Pending',
              dueDate: Timestamp.fromDate(nextDueDate),
              priority: plan.priority || 'Medium',
              estimatedDuration: plan.estimatedDurationPerTask || 60,
              timer: {
                totalDuration: 0,
                isPaused: false,
                pausedDuration: 0,
              },
              notes: [],
              attachments: [],
              assignedTo: plan.assignedTo,
              createdAt: Timestamp.now(),
              lastModified: Timestamp.now(),
              createdBy: 'local_generator',
            });
            tasksGeneratedCount++;
          });

          const planRef = doc(db, 'maintenance_plans', plan.id);
          batch.update(planRef, { lastGenerated: Timestamp.now() });
        }
      });

      if (tasksGeneratedCount > 0) {
        await batch.commit();
        toast({ 
          title: "Success ✅", 
          description: `Generated ${tasksGeneratedCount} new preventive tasks.` 
        });
      } else {
        toast({ 
          title: "No new tasks", 
          description: "All preventive tasks are already up to date." 
        });
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast({ 
        title: "Error", 
        description: "An error occurred while generating tasks.", 
        variant: "destructive" 
      });
    }
  };

  // حفظ المهمة التصحيحية
  const handleSaveCorrectiveTask = async () => {
    const { assetId, taskDescription, dueDate, priority, assignedTo, estimatedDuration, cost, notes } = correctiveFormData;
    
    if (!assetId || !taskDescription || !dueDate) {
      toast({ 
        title: "Error", 
        description: "Please fill out Asset, Description, and Due Date.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const assignedUser = users.find(u => u.id === assignedTo);
      
      await addDoc(collection(db, 'maintenance_tasks'), {
        planId: '', // مهمة مباشرة بدون خطة
        assetId,
        taskDescription,
        type: 'Corrective',
        status: 'Pending',
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        priority,
        estimatedDuration: estimatedDuration || 60,
        cost: cost || 0,
        timer: {
          totalDuration: 0,
          isPaused: false,
          pausedDuration: 0,
        },
        notes: notes ? [{ 
          id: Date.now().toString(), 
          text: notes, 
          createdAt: Timestamp.now(), 
          createdBy: 'current_user' 
        }] : [],
        attachments: [],
        assignedTo: assignedTo || null,
        assignedToName: assignedUser?.name || null,
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now(),
        createdBy: 'maintenance_manager',
      });

      toast({ 
        title: "Success ✅", 
        description: "Corrective maintenance task created successfully." 
      });
      
      setIsCorrectiveFormOpen(false);
      setCorrectiveFormData({
        assetId: '',
        taskDescription: '',
        priority: 'Medium',
        dueDate: new Date().toISOString().split('T')[0],
        estimatedDuration: 60,
      });
    } catch (error) {
      console.error("Error creating corrective task:", error);
      toast({ 
        title: "Error", 
        description: "An error occurred while creating the task.", 
        variant: "destructive" 
      });
    }
  };

  const handlePlanCreated = async (): Promise<void> => {
    setIsPlanFormOpen(false);
    toast({
      description: 'Maintenance plan saved successfully.',
      variant: 'default',
    });
  };

  /* ═══════════════════════════════════════════════════════════════
   *                         RENDER
   * ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* إحصائيات الأداء */}
      {performanceStats && <PerformanceStatsCard stats={performanceStats} />}

      {/* أزرار التحكم الرئيسية */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setIsPlanFormOpen(true)}
            className="flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Create Preventive Plan
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsCorrectiveFormOpen(true)}
            className="flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            Add Corrective Task
          </Button>

          <Button
            variant="outline"
            onClick={handleGeneratePreventiveTasks}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Generate Tasks
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </Badge>
        </div>
      </div>

      {/* شريط الفلترة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: any) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Needs Review">Needs Review</SelectItem>
                  <SelectItem value="Overdue">Overdue Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value: any) => setFilters({ ...filters, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value: any) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="Preventive">Preventive</SelectItem>
                  <SelectItem value="Corrective">Corrective</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asset</Label>
              <Select
                value={filters.assetId}
                onValueChange={(value) => setFilters({ ...filters, assetId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Assets</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* جدول المهام */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<EnhancedMaintenanceTask, any>
            columns={columns} 
            data={filteredTasks}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* نافذة إنشاء خطة الصيانة */}
      <CreateMaintenancePlan
        isOpen={isPlanFormOpen}
        onClose={() => setIsPlanFormOpen(false)}
        assets={assets}
        users={users}
        onPlanCreated={handlePlanCreated}
      />

      {/* نافذة إضافة مهمة تصحيحية */}
      <Dialog open={isCorrectiveFormOpen} onOpenChange={setIsCorrectiveFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Corrective Maintenance Task</DialogTitle>
            <DialogDescription>
              Create a new corrective maintenance task for immediate attention.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Asset *</Label>
                <Select
                  value={correctiveFormData.assetId}
                  onValueChange={(value) => setCorrectiveFormData({ ...correctiveFormData, assetId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={correctiveFormData.priority}
                  onValueChange={(value: Priority) => setCorrectiveFormData({ ...correctiveFormData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Task Description *</Label>
              <Textarea
                value={correctiveFormData.taskDescription}
                onChange={(e) => setCorrectiveFormData({ ...correctiveFormData, taskDescription: e.target.value })}
                placeholder="Describe the maintenance task in detail..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={correctiveFormData.dueDate}
                  onChange={(e) => setCorrectiveFormData({ ...correctiveFormData, dueDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Assigned To</Label>
                <Select
                  value={correctiveFormData.assignedTo || ''}
                  onValueChange={(value) => setCorrectiveFormData({ ...correctiveFormData, assignedTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Duration (minutes)</Label>
                <Input
                  type="number"
                  value={correctiveFormData.estimatedDuration || ''}
                  onChange={(e) => setCorrectiveFormData({ ...correctiveFormData, estimatedDuration: parseInt(e.target.value) || undefined })}
                  placeholder="60"
                />
              </div>

              <div>
                <Label>Estimated Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={correctiveFormData.cost || ''}
                  onChange={(e) => setCorrectiveFormData({ ...correctiveFormData, cost: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={correctiveFormData.notes || ''}
                onChange={(e) => setCorrectiveFormData({ ...correctiveFormData, notes: e.target.value })}
                placeholder="Additional notes or instructions..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCorrectiveFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCorrectiveTask}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}