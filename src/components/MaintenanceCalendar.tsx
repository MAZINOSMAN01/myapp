// src/components/MaintenanceCalendar.tsx
// نسخة متقدمة مع دعم المهام المتطورة والفلترة المحسنة

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Calendar as RBC, Views, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { localizer } from '@/lib/localizer';
import { db } from '@/firebase/config';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  Timestamp,
  getDocs,
  addDoc,
} from 'firebase/firestore';

import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Filter,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Star,
  Timer,
  DollarSign,
} from 'lucide-react';

// استيراد الأنواع المحدثة
import type {
  AdvancedMaintenanceTask,
  TaskStatus,
  Priority,
  MaintenanceCalendarEvent,
  CalendarFilters,
  Asset,
  MaintenancePlan,
  PerformanceStats,
} from '@/types/maintenance';

// تكوين التقويم مع السحب والإفلات
const DragCalendar = withDragAndDrop(RBC as any);

/* ═══════════════════════════════════════════════════════════════
 *                    COLOR CONFIGURATIONS
 * ═══════════════════════════════════════════════════════════════ */

const statusColors: Record<TaskStatus, { bg: string; border: string; text: string }> = {
  'Pending': { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' },
  'In Progress': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  'Completed': { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  'Partially Done': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  'Needs Review': { bg: '#fed7aa', border: '#ea580c', text: '#9a3412' },
  'Skipped': { bg: '#f3f4f6', border: '#6b7280', text: '#4b5563' },
  'Failed': { bg: '#fecaca', border: '#ef4444', text: '#991b1b' },
};

const priorityColors: Record<Priority, { bg: string; border: string }> = {
  'Low': { bg: '#d1fae5', border: '#10b981' },
  'Medium': { bg: '#fef3c7', border: '#f59e0b' },
  'High': { bg: '#fed7aa', border: '#ea580c' },
  'Critical': { bg: '#fecaca', border: '#ef4444' },
};

/* ═══════════════════════════════════════════════════════════════
 *                    HELPER COMPONENTS
 * ═══════════════════════════════════════════════════════════════ */

/** مكون عرض الحدث في التقويم */
const EventComponent: React.FC<{ event: MaintenanceCalendarEvent }> = ({ event }) => {
  const task = event.resource;
  const statusConfig = statusColors[task.status];
  const priorityConfig = priorityColors[task.priority];

  return (
    <div
      className="p-2 rounded text-xs h-full overflow-hidden"
      style={{
        backgroundColor: statusConfig.bg,
        borderLeft: `4px solid ${priorityConfig.border}`,
        color: statusConfig.text,
      }}
    >
      <div className="font-medium truncate">{task.taskDescription}</div>
      <div className="flex items-center justify-between mt-1">
        <Badge
          variant="outline"
          className="text-xs px-1 py-0"
          style={{ borderColor: statusConfig.border }}
        >
          {task.status}
        </Badge>
        <div className="flex items-center gap-1">
          {task.priority === 'Critical' && <AlertTriangle className="h-3 w-3 text-red-500" />}
          {task.status === 'Completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
          {task.timer.totalDuration > 0 && <Timer className="h-3 w-3" />}
          {task.qualityRating && task.qualityRating > 0 && (
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="text-xs ml-0.5">{task.qualityRating}</span>
            </div>
          )}
        </div>
      </div>
      {task.assignedToName && (
        <div className="text-xs text-gray-500 truncate mt-1">👤 {task.assignedToName}</div>
      )}
    </div>
  );
};

/** مكون شريط الفلترة */
const FilterBar: React.FC<{
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  assets: Asset[];
  users: string[];
}> = ({ filters, onFiltersChange, assets, users }) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* فلتر الحالة */}
          <div>
            <Label className="text-sm font-medium">Status</Label>
            <Select
              value={Array.isArray(filters.status) ? 'CUSTOM' : filters.status}
              onValueChange={(value) => {
                if (value === 'ALL') {
                  onFiltersChange({ ...filters, status: 'ALL' });
                } else {
                  onFiltersChange({ ...filters, status: [value as TaskStatus] });
                }
              }}
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

          {/* فلتر الأولوية */}
          <div>
            <Label className="text-sm font-medium">Priority</Label>
            <Select
              value={Array.isArray(filters.priority) ? 'CUSTOM' : filters.priority}
              onValueChange={(value) => {
                if (value === 'ALL') {
                  onFiltersChange({ ...filters, priority: 'ALL' });
                } else {
                  onFiltersChange({ ...filters, priority: [value as Priority] });
                }
              }}
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

          {/* فلتر الأصول */}
          <div>
            <Label className="text-sm font-medium">Asset</Label>
            <Select
              value={Array.isArray(filters.assetId) ? 'CUSTOM' : filters.assetId}
              onValueChange={(value) => {
                if (value === 'ALL') {
                  onFiltersChange({ ...filters, assetId: 'ALL' });
                } else {
                  onFiltersChange({ ...filters, assetId: [value] });
                }
              }}
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

          {/* فلتر المكلف */}
          <div>
            <Label className="text-sm font-medium">Assigned To</Label>
            <Select
              value={Array.isArray(filters.assignedTo) ? 'CUSTOM' : filters.assignedTo}
              onValueChange={(value) => {
                if (value === 'ALL') {
                  onFiltersChange({ ...filters, assignedTo: 'ALL' });
                } else {
                  onFiltersChange({ ...filters, assignedTo: [value] });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════
 *                    MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════ */

export function MaintenanceCalendar() {
  /* ═══════════════════════════════════════════════════════════════
   *                         STATE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════ */
  
  // البيانات الأساسية
  const [tasks, setTasks] = useState<AdvancedMaintenanceTask[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // إعدادات التقويم
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // الفلترة والبحث
  const [filters, setFilters] = useState<CalendarFilters>({
    status: 'ALL',
    priority: 'ALL',
    assetId: 'ALL',
    assignedTo: 'ALL',
    dateRange: {
      start: new Date(new Date().setDate(new Date().getDate() - 30)),
      end: new Date(new Date().setDate(new Date().getDate() + 30)),
    },
    showCompleted: true,
  });

  // النوافذ والحوارات
  const [selectedTask, setSelectedTask] = useState<AdvancedMaintenanceTask | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskSlot, setNewTaskSlot] = useState<{ start: Date; end: Date } | null>(null);

  // الإحصائيات
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);

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
      where('dueDate', '<=', Timestamp.fromDate(filters.dateRange.end))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
          } as AdvancedMaintenanceTask;
        });
        
        setTasks(fetchedTasks);
        calculatePerformanceStats(fetchedTasks);
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

  // تحميل الخطط
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'maintenance_plans'), (snapshot) => {
      const fetchedPlans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<MaintenancePlan, 'id'>),
      }));
      setPlans(fetchedPlans);
    });

    return () => unsubscribe();
  }, []);

  /* ═══════════════════════════════════════════════════════════════
   *                         COMPUTED VALUES
   * ═══════════════════════════════════════════════════════════════ */

  // المهام المفلترة
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // فلتر الحالة
      if (filters.status !== 'ALL') {
        if (Array.isArray(filters.status)) {
          if (!filters.status.includes(task.status)) return false;
        } else {
          if (filters.status === 'Overdue') {
            const isOverdue = task.dueDate.toDate() < new Date() && task.status !== 'Completed';
            if (!isOverdue) return false;
          } else if (task.status !== filters.status) {
            return false;
          }
        }
      }

      // فلتر الأولوية
      if (filters.priority !== 'ALL') {
        if (Array.isArray(filters.priority)) {
          if (!filters.priority.includes(task.priority)) return false;
        } else if (task.priority !== filters.priority) {
          return false;
        }
      }

      // فلتر الأصول
      if (filters.assetId !== 'ALL') {
        if (Array.isArray(filters.assetId)) {
          if (!filters.assetId.includes(task.assetId)) return false;
        } else if (task.assetId !== filters.assetId) {
          return false;
        }
      }

      // فلتر المكلف
      if (filters.assignedTo !== 'ALL') {
        if (Array.isArray(filters.assignedTo)) {
          if (!filters.assignedTo.includes(task.assignedTo || '')) return false;
        } else if (task.assignedTo !== filters.assignedTo) {
          return false;
        }
      }

      // فلتر إظهار المكتملة
      if (!filters.showCompleted && task.status === 'Completed') {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // أحداث التقويم
  const calendarEvents = useMemo((): MaintenanceCalendarEvent[] => {
    return filteredTasks.map((task) => ({
      id: task.id,
      title: task.taskDescription,
      start: task.dueDate.toDate(),
      end: new Date(task.dueDate.toDate().getTime() + (task.estimatedDuration || 60) * 60000),
      resource: task,
      allDay: false,
      color: statusColors[task.status].bg,
      textColor: statusColors[task.status].text,
      backgroundColor: statusColors[task.status].bg,
      borderColor: priorityColors[task.priority].border,
    }));
  }, [filteredTasks]);

  // قائمة المستخدمين
  const users = useMemo(() => {
    const userSet = new Set<string>();
    tasks.forEach((task) => {
      if (task.assignedToName) userSet.add(task.assignedToName);
    });
    return Array.from(userSet);
  }, [tasks]);

  // حساب الإحصائيات
  const calculatePerformanceStats = useCallback((tasks: AdvancedMaintenanceTask[]) => {
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
  }, []);

  /* ═══════════════════════════════════════════════════════════════
   *                         EVENT HANDLERS
   * ═══════════════════════════════════════════════════════════════ */

  // تحديث المهمة بالسحب والإفلات
  const handleEventDrop = useCallback(async ({ event, start, end }: any) => {
    try {
      const task = event.resource as AdvancedMaintenanceTask;
      
      await updateDoc(doc(db, 'maintenance_tasks', task.id), {
        dueDate: Timestamp.fromDate(start),
        lastModified: Timestamp.now(),
      });

      toast({
        title: 'Task Updated',
        description: 'Task date has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task date.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // اختيار المهمة
  const handleSelectEvent = useCallback((event: MaintenanceCalendarEvent) => {
    setSelectedTask(event.resource);
    setShowTaskDetails(true);
  }, []);

  // إنشاء مهمة جديدة في فترة زمنية
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setNewTaskSlot({ start, end });
    setShowCreateTask(true);
  }, []);

  // تحديث حالة المهمة
  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateDoc(doc(db, 'maintenance_tasks', taskId), {
        status: newStatus,
        lastModified: Timestamp.now(),
        ...(newStatus === 'Completed' && { completedAt: Timestamp.now() }),
      });

      toast({
        title: 'Status Updated',
        description: `Task status updated to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task status.',
        variant: 'destructive',
      });
    }
  };

  /* ═══════════════════════════════════════════════════════════════
   *                         RENDER
   * ═══════════════════════════════════════════════════════════════ */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading Advanced Calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* شريط الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                  <p className="text-2xl font-bold">{performanceStats?.totalTasks || 0}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {performanceStats?.completedTasks || 0}
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
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {performanceStats?.pendingTasks || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {performanceStats?.overdueTasks || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Quality</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {performanceStats?.averageQualityRating?.toFixed(1) || '0.0'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* شريط الفلترة */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          assets={assets}
          users={users}
        />

        {/* أزرار التحكم */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  ...filters,
                  dateRange: {
                    start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                    end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
                  },
                });
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </Badge>
          </div>
        </div>

        {/* التقويم الرئيسي */}
        <Card>
          <CardContent className="p-4">
            <div style={{ height: '600px' }}>
              <DragCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                views={['month', 'week', 'day', 'agenda']}
                view={currentView}
                onView={setCurrentView}
                date={currentDate}
                onNavigate={setCurrentDate}
                onEventDrop={handleEventDrop}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                resizable
                popup
                components={{
                  event: EventComponent,
                }}
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: event.backgroundColor,
                    borderColor: event.borderColor,
                    color: event.textColor,
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                  },
                })}
                dayPropGetter={(date) => {
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  return {
                    style: isToday
                      ? {
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #0ea5e9',
                        }
                      : {},
                  };
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* نافذة تفاصيل المهمة */}
        <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
              <DialogDescription>
                Complete information about the selected maintenance task
              </DialogDescription>
            </DialogHeader>

            {selectedTask && (
              <div className="space-y-4">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Task Description</Label>
                    <p className="p-2 border rounded bg-gray-50">{selectedTask.taskDescription}</p>
                  </div>
                  <div>
                    <Label>Current Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        style={{
                          backgroundColor: statusColors[selectedTask.status].bg,
                          color: statusColors[selectedTask.status].text,
                        }}
                      >
                        {selectedTask.status}
                      </Badge>
                      <Badge
                        style={{
                          backgroundColor: priorityColors[selectedTask.priority].bg,
                          borderColor: priorityColors[selectedTask.priority].border,
                        }}
                      >
                        {selectedTask.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* معلومات الوقت والتكلفة */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Due Date</Label>
                    <p className="p-2 border rounded bg-gray-50">
                      {selectedTask.dueDate.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <p className="p-2 border rounded bg-gray-50">
                      {Math.floor(selectedTask.timer.totalDuration / 60)}h{' '}
                      {selectedTask.timer.totalDuration % 60}m
                    </p>
                  </div>
                  <div>
                    <Label>Cost</Label>
                    <p className="p-2 border rounded bg-gray-50">
                      {selectedTask.cost ? `$${selectedTask.cost}` : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* إجراءات سريعة */}
                <div className="space-y-2">
                  <Label>Quick Actions</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedTask.id, 'In Progress')}
                      disabled={selectedTask.status === 'In Progress'}
                    >
                      Start
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedTask.id, 'Completed')}
                      disabled={selectedTask.status === 'Completed'}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedTask.id, 'Needs Review')}
                    >
                      Needs Review
                    </Button>
                  </div>
                </div>

                {/* ملاحظات */}
                {selectedTask.notes.length > 0 && (
                  <div>
                    <Label>Notes ({selectedTask.notes.length})</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedTask.notes.slice(-3).map((note) => (
                        <div key={note.id} className="p-2 border rounded bg-gray-50 text-sm">
                          <p>{note.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {note.createdBy} - {note.createdAt.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTaskDetails(false)}>
                Close
              </Button>
              <Button onClick={() => setShowTaskDetails(false)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}