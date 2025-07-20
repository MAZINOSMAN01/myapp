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
  orderBy, // 🔥 FIXED: Added orderBy import
} from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  FileText, 
  DollarSign, 
  User, 
  Calendar, 
  MessageSquare,
  Star,
  StarOff,
  Timer,
  Target,
  TrendingUp,
  Activity,
  Award,
  Users,
  Save,
  Plus,
  Minus,
  RefreshCw,
  Settings,
  Info,
  CheckSquare,
  Square as SquareIcon,
  AlertTriangle,
  XCircle,
  Zap,
  Shield,
  Wrench,
  Cog,
  Settings as SettingsIcon,
  Database,
  HardDrive,
  Monitor,
  Server,
  Cpu,
  Memory,
  Bluetooth,
  Wifi,
  Power,
  Battery,
  Plug,
  Lightbulb,
  Flame,
  Droplets,
  Wind,
  Thermometer,
  Gauge,
  Speedometer,
  BarChart,
  PieChart,
  LineChart,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MoreVertical,
  Filter,
  Sort,
  Search,
  Download,
  Upload,
  Share,
  Copy,
  Trash,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Home,
  Building,
  MapPin,
  Navigation,
  Compass,
  Map,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Inbox,
  Outbox,
  Archive,
  Folder,
  File,
  Image,
  Video,
  Music,
  Headphones,
  Speaker,
  Mic,
  Camera,
  Printer,
  Scanner,
  Keyboard,
  Mouse,
  Gamepad,
  Joystick,
  Controller,
  Tv,
  Radio,
  Satellite,
  Antenna,
  Router,
  Modem,
  Hub,
  Switch,
  Cable,
  Usb,
  Ethernet,
  Hdmi,
  Sd,
  Sim,
  Chip,
  Disc,
  Dvd,
  Cd,
  Cassette,
  Floppy,
  Save as SaveIcon,
  Folder as FolderIcon,
  FolderOpen,
  FolderClosed,
  FilePlus,
  FileMinus,
  FileText as FileTextIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileSlides,
  FilePdf,
  FileWord,
  FileExcel,
  FilePowerpoint,
  FileZip,
  FileArchive,
  FileJson,
  FileXml,
  FileCsv,
  FileMarkdown,
  FileHtml,
  FileCss,
  FileJs,
  FileTs,
  FilePython,
  FileJava,
  FileCpp,
  FilePhp,
  FileRuby,
  FileGo,
  FileRust,
  FileSwift,
  FileKotlin,
  FileDart,
  FileScala,
  FileHaskell,
  FileClojure,
  FileElixir,
  FileErlang,
  FilePerl,
  FileLua,
  FileShell,
  FileBash,
  FilePowershell,
  FileDocker,
  FileKubernetes,
  FileYaml,
  FileToml,
  FileIni,
  FileEnv,
  FileLog,
  FileConfig,
  FileDatabase,
  FileSql,
  FileNoSql,
  FileRedis,
  FileMongodb,
  FilePostgres,
  FileMysql,
  FileSqlite,
  FileFirebase,
  FileAws,
  FileAzure,
  FileGoogle,
  FileGithub,
  FileGitlab,
  FileBitbucket,
  FileJira,
  FileSlack,
  FileDiscord,
  FileTelegram,
  FileWhatsapp,
  FileSkype,
  FileZoom,
  FileTeams,
  FileMeet,
  FileCalendar,
  FileContact,
  FileBookmark,
  FileNote,
  FileTask,
  FileProject,
  FileReport,
  FileChart,
  FileGraph,
  FileStatistics,
  FileAnalytics,
  FileMetrics,
  FileKpi,
  FileDashboard,
  FileWidget,
  FileComponent,
  FileModule,
  FilePackage,
  FileLibrary,
  FileFramework,
  FilePlugin,
  FileExtension,
  FileTheme,
  FileTemplate,
  FileLayout,
  FileDesign,
  FileArt,
  FilePhoto,
  FilePicture,
  FileGraphic,
  FileVector,
  FileRaster,
  FileSvg,
  FilePng,
  FileJpg,
  FileGif,
  FileWebp,
  FileIco,
  FileBmp,
  FileTiff,
  FileRaw,
  FileEps,
  FileAi,
  FilePsd,
  FileXd,
  FileFigma,
  FileSketch,
  FileInvision,
  FileMarvel,
  FileZeplin,
  FileAbstract,
  FileFramer,
  FilePrinciple,
  FileOrigami,
  FileFlinto,
  FileProtopie,
  FileAxure,
  FileBalsamiq,
  FileJustinmind,
  FileUxpin,
  FileInvision as FileInvisionIcon,
  FileMarvel as FileMarvelIcon,
  FileZeplin as FileZeplinIcon,
  FileAbstract as FileAbstractIcon,
  FileFramer as FileFramerIcon,
  FilePrinciple as FilePrincipleIcon,
  FileOrigami as FileOrigamiIcon,
  FileFlinto as FileFlintoIcon,
  FileProtopie as FileProtopieIcon,
  FileAxure as FileAxureIcon,
  FileBalsamiq as FileBalsamiqIcon,
  FileJustinmind as FileJustinmindIcon,
  FileUxpin as FileUxpinIcon
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { MaintenanceReportPDF } from '@/components/MaintenanceReportPDF';
import { MaintenancePeriodReportPDF } from '@/components/MaintenancePeriodReportPDF';

// استيراد الأنواع المحدثة
import type { 
  MaintenancePlan, 
  AdvancedMaintenanceTask,
  TaskStatus,
  Priority,
  MaintenanceNote,
  PerformanceStats,
  TimerState
} from '@/types/maintenance';

interface Props {
  plan: MaintenancePlan;
}

// مكون تقييم الجودة بالنجوم
const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
  return (
    <div className="flex gap-1" title={`Quality Rating: ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRatingChange(star)}
          className={`p-1 rounded transition-colors ${
            star <= rating 
              ? 'text-yellow-400 hover:text-yellow-500' 
              : 'text-gray-300 hover:text-gray-400'
          }`}
        >
          <Star className="h-4 w-4 fill-current" />
        </button>
      ))}
    </div>
  );
};

// مكون العداد التفاعلي
const TaskTimer = ({ 
  task, 
  onUpdateTimer 
}: { 
  task: AdvancedMaintenanceTask;
  onUpdateTimer: (task: AdvancedMaintenanceTask, timerState: TimerState) => void;
}) => {
  const [localTimer, setLocalTimer] = useState(task.timer);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (localTimer.isRunning && !localTimer.isPaused) {
      intervalRef.current = setInterval(() => {
        setLocalTimer(prev => {
          const newTimer = { ...prev, totalDuration: prev.totalDuration + 1 };
          onUpdateTimer(task, newTimer);
          return newTimer;
        });
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
  }, [localTimer.isRunning, localTimer.isPaused, task, onUpdateTimer]);

  const startTimer = () => {
    const newTimer = { ...localTimer, isRunning: true, isPaused: false };
    setLocalTimer(newTimer);
    onUpdateTimer(task, newTimer);
  };

  const pauseTimer = () => {
    const newTimer = { ...localTimer, isPaused: true };
    setLocalTimer(newTimer);
    onUpdateTimer(task, newTimer);
  };

  const stopTimer = () => {
    const newTimer = { ...localTimer, isRunning: false, isPaused: false };
    setLocalTimer(newTimer);
    onUpdateTimer(task, newTimer);
  };

  const resetTimer = () => {
    const newTimer = { totalDuration: 0, isRunning: false, isPaused: false, pausedDuration: 0 };
    setLocalTimer(newTimer);
    onUpdateTimer(task, newTimer);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
        {formatTime(localTimer.totalDuration)}
      </div>
      <div className="flex gap-1">
        {!localTimer.isRunning || localTimer.isPaused ? (
          <Button size="sm" variant="outline" onClick={startTimer} className="h-7 w-7 p-0" title="Start Timer">
            <Play className="h-3 w-3" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={pauseTimer} className="h-7 w-7 p-0" title="Pause Timer">
            <Pause className="h-3 w-3" />
          </Button>
        )}
        {(localTimer.isRunning || localTimer.isPaused) && (
          <Button size="sm" variant="default" onClick={stopTimer} className="h-7 w-7 p-0" title="Stop Timer">
            <Square className="h-3 w-3" />
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={resetTimer} className="h-7 w-7 p-0" title="Reset Timer">
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// مكون شارة الحالة
const TaskStatusBadge = ({ status }: { status: TaskStatus }) => {
  const variants = {
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    'In Progress': { bg: 'bg-blue-100', text: 'text-blue-800', icon: RefreshCw },
    Completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    Cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    Overdue: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle },
    Skipped: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ArrowRight }
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <Badge className={`${variant.bg} ${variant.text} flex items-center gap-1`} variant="secondary">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
};

// مكون شارة الأولوية
const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const variants = {
    Low: { bg: 'bg-green-100', text: 'text-green-800', icon: ArrowDown },
    Medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Minus },
    High: { bg: 'bg-orange-100', text: 'text-orange-800', icon: ArrowUp },
    Critical: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle }
  };

  const variant = variants[priority];
  const Icon = variant.icon;

  return (
    <Badge className={`${variant.bg} ${variant.text} flex items-center gap-1`} variant="secondary">
      <Icon className="h-3 w-3" />
      {priority}
    </Badge>
  );
};

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

    // 🔥 FIXED: Load all tasks for this plan without date filtering to preserve existing tasks
    const q = query(
      collection(db, 'maintenance_tasks'),
      where('planId', '==', plan.id),
      orderBy('dueDate', 'asc')
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
              isRunning: false,
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
            attachments: data.attachments || [],
            createdAt: data.createdAt,
            lastModified: data.lastModified,
            createdBy: data.createdBy,
          };

          return advancedTask;
        });

        setTasks(fetchedTasks);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        setIsLoading(false);
        toast({
          title: 'Database Error',
          description: 'Failed to load maintenance tasks',
          variant: 'destructive',
        });
      }
    );

    return unsubscribe;
  }, [plan?.id, toast]);

  // حساب إحصائيات الأداء
  useEffect(() => {
    if (tasks.length > 0) {
      const completed = tasks.filter(t => t.status === 'Completed').length;
      const inProgress = tasks.filter(t => t.status === 'In Progress').length;
      const pending = tasks.filter(t => t.status === 'Pending').length;
      const overdue = tasks.filter(t => t.status === 'Overdue').length;
      
      const totalCost = tasks.reduce((sum, task) => sum + (task.cost || 0), 0);
      const totalTime = tasks.reduce((sum, task) => sum + (task.timer?.totalDuration || 0), 0);
      const avgRating = tasks.filter(t => t.qualityRating).reduce((sum, task, _, arr) => 
        sum + (task.qualityRating || 0) / arr.length, 0
      );

      setPerformanceStats({
        totalTasks: tasks.length,
        completedTasks: completed,
        inProgressTasks: inProgress,
        pendingTasks: pending,
        overdueTasks: overdue,
        completionRate: (completed / tasks.length) * 100,
        totalCost,
        avgCompletionTime: totalTime / Math.max(completed, 1),
        avgQualityRating: avgRating,
      });
    }
  }, [tasks]);

  // تحديث حالة المهمة
  const updateTaskStatus = async (task: AdvancedMaintenanceTask, newStatus: TaskStatus) => {
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
        description: `Task marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      });
    }
  };

  // تحديث تقييم الجودة
  const handleQualityRatingUpdate = async (task: AdvancedMaintenanceTask, rating: number) => {
    try {
      await updateDoc(doc(db, 'maintenance_tasks', task.id), {
        qualityRating: rating,
        lastModified: Timestamp.now(),
      });
      
      toast({
        title: 'Rating Updated',
        description: `Quality rating set to ${rating}/5`,
      });
    } catch (error) {
      console.error('Rating update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quality rating',
        variant: 'destructive',
      });
    }
  };

  // تحديث العداد
  const handleTimerUpdate = async (task: AdvancedMaintenanceTask, timerState: TimerState) => {
    try {
      await updateDoc(doc(db, 'maintenance_tasks', task.id), {
        timer: timerState,
        lastModified: Timestamp.now(),
      });
    } catch (error) {
      console.error('Timer update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task timer',
        variant: 'destructive',
      });
    }
  };

  // إضافة ملاحظة جديدة
  const addTaskNote = async (task: AdvancedMaintenanceTask, noteText: string) => {
    if (!noteText.trim()) return;
    
    try {
      const newNote: MaintenanceNote = {
        id: Date.now().toString(),
        text: noteText,
        createdAt: Timestamp.now(),
        createdBy: 'current_user',
      };

      const updatedNotes = [...(task.notes || []), newNote];
      
      await updateDoc(doc(db, 'maintenance_tasks', task.id), {
        notes: updatedNotes,
        lastModified: Timestamp.now(),
      });

      toast({
        title: 'Added',
        description: 'Note added successfully',
      });
    } catch (error) {
      console.error('Note addition failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    }
  };

  // حفظ ملاحظات الفترة
  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    
    try {
      await addDoc(collection(db, 'period_notes'), {
        planId: plan.id,
        notes: notes,
        createdAt: Timestamp.now(),
        createdBy: 'current_user',
      });
      
      toast({
        title: 'Notes Saved',
        description: 'Period notes saved successfully',
      });
      
      setNotes('');
    } catch (error) {
      console.error('Note saving failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  // تقرير الأداء
  const generatePerformanceReport = () => {
    if (!performanceStats) return;

    const report = {
      planName: plan.planName,
      generatedAt: new Date().toISOString(),
      stats: performanceStats,
      tasks: tasks.map(task => ({
        id: task.id,
        description: task.taskDescription,
        status: task.status,
        completedAt: task.completedAt?.toDate().toISOString(),
        duration: task.timer?.totalDuration || 0,
        cost: task.cost || 0,
        quality: task.qualityRating || 0,
      })),
    };

    console.log('Performance Report:', report);
    toast({
      title: 'Report Generated',
      description: 'Performance report generated successfully',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const headers = tasks.length > 0 
    ? Array.from(new Set(tasks.map(t => t.dueDate?.toDate().toLocaleDateString() || 'No Date')))
    : ['No Tasks'];

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* إحصائيات الأداء */}
      {performanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{performanceStats.totalTasks}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{performanceStats.completedTasks}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{performanceStats.inProgressTasks}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{performanceStats.completionRate.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${performanceStats.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* شريط التقدم */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Overall Progress</h3>
            <span className="text-sm text-gray-600">
              {performanceStats?.completedTasks || 0} of {performanceStats?.totalTasks || 0} tasks completed
            </span>
          </div>
          <Progress 
            value={performanceStats?.completionRate || 0} 
            className="w-full h-2" 
          />
        </CardContent>
      </Card>

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
          
          <PDFDownloadLink
            document={
              <MaintenancePeriodReportPDF 
                tasks={tasks}
                planName={plan.planName}
                assetName={plan.assetName}
                periodLabel={`${plan.scheduleType} - ${new Date().toLocaleDateString()}`}
              />
            }
            fileName={`Maintenance-Period-Report-${plan.planName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`}
          >
            {({ loading }) => (
              <Button
                variant="outline"
                disabled={loading}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
              >
                <FileText className="h-4 w-4" />
                {loading ? 'Generating...' : 'Download Period Report'}
              </Button>
            )}
          </PDFDownloadLink>
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
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="hover:bg-gray-50">
                <TableCell className="sticky left-0 z-10 bg-background border-r">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">{task.taskDescription}</div>
                    <div className="flex flex-wrap gap-1">
                      <TaskStatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.assignedToName && `Assigned to: ${task.assignedToName}`}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <TaskTimer 
                        task={task}
                        onUpdateTimer={handleTimerUpdate}
                      />
                    </div>
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant={task.status === 'Pending' ? 'default' : 'outline'}
                        onClick={() => updateTaskStatus(task, 'Pending')}
                      >
                        <Clock className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={task.status === 'In Progress' ? 'default' : 'outline'}
                        onClick={() => updateTaskStatus(task, 'In Progress')}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={task.status === 'Completed' ? 'default' : 'outline'}
                        onClick={() => updateTaskStatus(task, 'Completed')}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex justify-center gap-1"></div>
                    <div className="flex justify-center">
                      <StarRating
                        rating={task.qualityRating || 0}
                        onRatingChange={(rating) => handleQualityRatingUpdate(task, rating)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDetails(true);
                        }}
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
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
                  <Label>Reviewed By</Label> {/* 🔥 FIXED: Changed from "Completed By" to "Reviewed By" */}
                  <p className="mt-1 p-2 border rounded-md bg-gray-50">
                    {selectedTask.completedBy || 'Not reviewed'} {/* 🔥 FIXED: Changed from "Not completed" to "Not reviewed" */}
                  </p>
                </div>
                <div>
                  <Label>Cost</Label>
                  <p className="mt-1 p-2 border rounded-md bg-gray-50">
                    {selectedTask.cost ? `$${selectedTask.cost}` : 'No cost recorded'}
                  </p>
                </div>
              </div>

              {/* ملاحظات المهمة */}
              <div className="space-y-4">
                <div>
                  <Label>Task Notes</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {selectedTask.notes && selectedTask.notes.length > 0 ? (
                      selectedTask.notes.map((note, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded-md text-sm">
                          <p>{note.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {note.createdAt?.toDate().toLocaleString()} by {note.createdBy}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No notes available</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a new note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (newNote.trim()) {
                        addTaskNote(selectedTask, newNote);
                        setNewNote('');
                      }
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
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