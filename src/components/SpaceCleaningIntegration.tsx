import React, { useState, useEffect, useMemo } from 'react'
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/use-toast'

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker' // Assuming this custom component exists

// Icons
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  MapPin,
  Brush,
  WashingMachine,
  Zap,
  Droplets,
  Trash2,
} from 'lucide-react'

import type { SpaceLocation } from '@/types/space-management'

// Types
interface CleaningTask {
  id: string
  spaceId: string
  spaceName: string
  taskName: string
  taskType: 'Daily' | 'Weekly' | 'Monthly' | 'Deep Clean' | 'Maintenance'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  assignedTo?: string
  assignedToName?: string
  scheduledDate: Timestamp
  estimatedDuration: number // in minutes
  instructions: string
  requiredSupplies: string[]
  requiredEquipment: string[]
  status: 'Pending' | 'In Progress' | 'Completed' | 'Skipped' | 'Cancelled'
  createdAt: Timestamp
  completedAt?: Timestamp
  notes?: string
  qualityScore?: number
  issues?: string[]
}

interface CleaningTemplateTask {
  name: string
  description: string
  frequency: 'Daily' | 'Weekly' | 'Monthly'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  estimatedDuration: number
  requiredSupplies: string[]
  requiredEquipment: string[]
  instructions: string
}

interface CleaningTemplate {
  id: string
  name: string
  description: string
  spaceTypes: string[]
  spaceLabels: string[]
  tasks: CleaningTemplateTask[]
}

// Default Templates (Translated to English)
const defaultTemplates: CleaningTemplate[] = [
  {
    id: 'office-daily',
    name: 'Daily Office Cleaning',
    description: 'Basic daily cleaning for office areas.',
    spaceTypes: ['Office'],
    spaceLabels: ['Office', 'Admin'],
    tasks: [
      {
        name: 'Desk & Surface Wipe-down',
        description: 'Wipe desk surfaces and clean equipment.',
        frequency: 'Daily',
        priority: 'Medium',
        estimatedDuration: 15,
        requiredSupplies: ['All-purpose cleaner', 'Paper towels', 'Disinfectant'],
        requiredEquipment: ['Microfiber cloth', 'Spray bottle'],
        instructions: 'Wipe all surfaces, including screens and peripherals.',
      },
      {
        name: 'Floor Cleaning',
        description: 'Sweep and mop the floors.',
        frequency: 'Daily',
        priority: 'Medium',
        estimatedDuration: 10,
        requiredSupplies: ['Floor cleaner', 'Disinfectant'],
        requiredEquipment: ['Broom', 'Mop'],
        instructions: 'Sweep floors and then mop with disinfectant solution.',
      },
    ],
  },
  {
    id: 'bathroom-daily',
    name: 'Daily Bathroom Sanitization',
    description: 'Comprehensive daily cleaning for all bathrooms.',
    spaceTypes: ['Bathroom'],
    spaceLabels: [],
    tasks: [
      {
        name: 'Sanitize Toilets & Sinks',
        description: 'Thoroughly clean and disinfect toilets and sinks.',
        frequency: 'Daily',
        priority: 'High',
        estimatedDuration: 20,
        requiredSupplies: ['Bathroom cleaner', 'Strong disinfectant', 'Toilet bowl cleaner'],
        requiredEquipment: ['Scrub brush', 'Gloves', 'Microfiber cloth'],
        instructions: 'Clean all surfaces, disinfecting toilets and sinks.',
      },
    ],
  },
]

export function SpaceCleaningIntegration() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [spaces, setSpaces] = useState<SpaceLocation[]>([])
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([])
  const [templates, setTemplates] = useState<CleaningTemplate[]>([])
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'spaces'>('overview')

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)

  const [filters, setFilters] = useState({
    spaceType: '',
    priority: '',
    status: '',
    assignedTo: '',
    taskType: '',
  })

  const [taskFormData, setTaskFormData] = useState({
    taskName: '',
    taskType: 'Daily' as CleaningTask['taskType'],
    priority: 'Medium' as CleaningTask['priority'],
    assignedTo: '',
    scheduledDate: new Date(),
    estimatedDuration: 30,
    instructions: '',
    requiredSupplies: '',
    requiredEquipment: '',
    notes: '',
  })

  const guardAuth = () => {
    if (!currentUser) {
      toast({ title: 'Unauthorized', description: 'Please log in first.', variant: 'destructive' })
      return false
    }
    return true
  }

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    const unsubSpaces = onSnapshot(
      collection(db, 'space_locations'),
      (snap) => {
        setSpaces(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SpaceLocation[])
      },
      (err: any) => {
        toast({
          title: 'Error Loading Spaces',
          description: err.code === 'permission-denied' ? 'Permission denied to read spaces.' : 'Could not load spaces.',
          variant: 'destructive',
        })
      }
    )

    const fetchTasksAndTemplates = async () => {
      try {
        const [tasksSnap, tmplSnap] = await Promise.all([
          getDocs(query(collection(db, 'cleaning_tasks'), orderBy('scheduledDate', 'asc'))),
          getDocs(collection(db, 'cleaning_templates')),
        ])
        setCleaningTasks(tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as CleaningTask[])
        const tmplData = tmplSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as CleaningTemplate[]
        setTemplates(tmplData.length ? tmplData : defaultTemplates)
      } catch (err: any) {
        toast({
          title: 'Data Error',
          description: err.code === 'permission-denied' ? 'Permission denied to access cleaning data.' : 'Failed to load cleaning data.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchTasksAndTemplates()

    return () => unsubSpaces()
  }, [currentUser, toast])

  const handleCreateCleaningTask = async () => {
    if (!guardAuth()) return
    if (!taskFormData.taskName || selectedSpaces.length === 0) {
      return toast({ title: 'Warning', description: 'Please fill out all fields and select at least one space.', variant: 'destructive' })
    }

    try {
      const tasks = selectedSpaces.map((spaceId) => {
        const space = spaces.find((s) => s.id === spaceId)
        if (!space) return null
        return {
          spaceId: space.id,
          spaceName: space.displayName,
          taskName: taskFormData.taskName,
          taskType: taskFormData.taskType,
          priority: taskFormData.priority,
          assignedTo: taskFormData.assignedTo,
          scheduledDate: Timestamp.fromDate(taskFormData.scheduledDate),
          estimatedDuration: taskFormData.estimatedDuration,
          instructions: taskFormData.instructions,
          requiredSupplies: taskFormData.requiredSupplies.split(',').map((i) => i.trim()).filter(Boolean),
          requiredEquipment: taskFormData.requiredEquipment.split(',').map((i) => i.trim()).filter(Boolean),
          status: 'Pending' as CleaningTask['status'],
          createdAt: Timestamp.now(),
          notes: taskFormData.notes,
        }
      }).filter(Boolean) as Omit<CleaningTask, 'id'>[]

      await Promise.all(tasks.map((t) => addDoc(collection(db, 'cleaning_tasks'), t)))
      toast({ title: 'Success', description: `Successfully created ${tasks.length} tasks.` })
      setSelectedSpaces([])
      setIsCreateTaskDialogOpen(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to create tasks.', variant: 'destructive' })
    }
  }

  const applyCleaningTemplate = async (templateId: string) => {
    if (!guardAuth()) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return toast({ title: 'Error', description: 'Template not found.', variant: 'destructive' });
    }

    const matchingSpaces = spaces.filter(s => 
      template.spaceTypes.includes(s.spaceType) ||
      (s.structure.label && template.spaceLabels.includes(s.structure.label))
    );

    if (matchingSpaces.length === 0) {
      return toast({ title: 'Info', description: 'No matching spaces found for this template.', variant: 'default' });
    }

    try {
      const newTasks: Omit<CleaningTask, 'id'>[] = [];
      matchingSpaces.forEach(space => {
        template.tasks.forEach(taskTemplate => {
          newTasks.push({
            spaceId: space.id,
            spaceName: space.displayName,
            taskName: taskTemplate.name,
            taskType: taskTemplate.frequency,
            priority: taskTemplate.priority,
            scheduledDate: Timestamp.now(), // Or a more complex scheduling logic
            estimatedDuration: taskTemplate.estimatedDuration,
            instructions: taskTemplate.instructions,
            requiredSupplies: taskTemplate.requiredSupplies,
            requiredEquipment: taskTemplate.requiredEquipment,
            status: 'Pending',
            createdAt: Timestamp.now(),
          });
        });
      });

      await Promise.all(newTasks.map(t => addDoc(collection(db, 'cleaning_tasks'), t)));
      toast({ title: 'Success', description: `Applied template and created ${newTasks.length} tasks.` });
      setIsTemplateDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to apply template.', variant: 'destructive' });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: CleaningTask['status']) => {
    if (!guardAuth()) return
    try {
      const updateData: Partial<CleaningTask> = { status: newStatus }
      if (newStatus === 'Completed') {
        updateData.completedAt = Timestamp.now()
      }
      await updateDoc(doc(db, 'cleaning_tasks', taskId), updateData as any)
      setCleaningTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, ...updateData } : t)
      )
      toast({ title: 'Success', description: 'Task status updated successfully.' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update task status.', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: CleaningTask['status']) => {
    const variants = {
      Pending: 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      Completed: 'bg-green-100 text-green-800',
      Skipped: 'bg-gray-100 text-gray-800',
      Cancelled: 'bg-red-100 text-red-800',
    } as const
    return <Badge className={variants[status]}>{status}</Badge>
  }

  const getPriorityBadge = (priority: CleaningTask['priority']) => {
    const variants = {
      Low: 'bg-green-100 text-green-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-orange-100 text-orange-800',
      Critical: 'bg-red-100 text-red-800',
    } as const
    return <Badge className={variants[priority]}>{priority}</Badge>
  }

  const getTaskTypeIcon = (taskType: CleaningTask['taskType']) => {
    const iconProps = { className: "h-4 w-4" };
    switch (taskType) {
      case 'Daily': return <Brush {...iconProps} />
      case 'Weekly': return <WashingMachine {...iconProps} />
      case 'Monthly': return <Zap {...iconProps} />
      case 'Deep Clean': return <Droplets {...iconProps} />
      case 'Maintenance': return <Trash2 {...iconProps} />
      default: return <Sparkles {...iconProps} />
    }
  }

  const filteredTasks = useMemo(() => {
    return cleaningTasks.filter(task => {
      const space = spaces.find(s => s.id === task.spaceId)
      if (!space) return false
      const mSpaceType = !filters.spaceType || space.spaceType === filters.spaceType
      const mPriority = !filters.priority || task.priority === filters.priority
      const mStatus = !filters.status || task.status === filters.status
      const mTaskType = !filters.taskType || task.taskType === filters.taskType
      const mAssigned = !filters.assignedTo || task.assignedTo === filters.assignedTo
      return mSpaceType && mPriority && mStatus && mTaskType && mAssigned
    })
  }, [cleaningTasks, spaces, filters])

  const statistics = useMemo(() => ({
    totalTasks: cleaningTasks.length,
    pendingTasks: cleaningTasks.filter(t => t.status === 'Pending').length,
    inProgressTasks: cleaningTasks.filter(t => t.status === 'In Progress').length,
    completedTasks: cleaningTasks.filter(t => t.status === 'Completed').length,
    skippedTasks: cleaningTasks.filter(t => t.status === 'Skipped').length,
    dailyTasks: cleaningTasks.filter(t => t.taskType === 'Daily').length,
    weeklyTasks: cleaningTasks.filter(t => t.taskType === 'Weekly').length,
    monthlyTasks: cleaningTasks.filter(t => t.taskType === 'Monthly').length,
    criticalTasks: cleaningTasks.filter(t => t.priority === 'Critical').length,
  }), [cleaningTasks])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading Cleaning Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Space Cleaning</h1>
          <p className="text-gray-600">Manage cleaning tasks for spaces and locations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Brush className="h-4 w-4 mr-2" />
                Cleaning Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="desc-templates">
              <DialogHeader>
                <DialogTitle>Apply Cleaning Template</DialogTitle>
                <DialogDescription id="desc-templates">
                  Select a template to automatically generate cleaning tasks for matching spaces.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {template.spaceTypes.map((type) => (
                            <Badge key={type} variant="outline">{type}</Badge>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">{template.tasks.length} cleaning tasks</p>
                        <Button
                          size="sm"
                          onClick={() => applyCleaningTemplate(template.id)}
                          className="w-full"
                        >
                          Apply Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Cleaning Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-describedby="desc-create-task">
              <DialogHeader>
                <DialogTitle>Create New Cleaning Task</DialogTitle>
                <DialogDescription id="desc-create-task">
                  Fill in the task details, select the target spaces, and click "Create Task".
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Task Name</Label>
                    <Input
                      value={taskFormData.taskName}
                      onChange={(e) => setTaskFormData({ ...taskFormData, taskName: e.target.value })}
                      placeholder="e.g., Daily Office Cleaning"
                    />
                  </div>
                  <div>
                    <Label>Task Type</Label>
                    <Select
                      value={taskFormData.taskType}
                      onValueChange={(v) => setTaskFormData({ ...taskFormData, taskType: v as CleaningTask['taskType'] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Deep Clean">Deep Clean</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={taskFormData.priority}
                      onValueChange={(v) => setTaskFormData({ ...taskFormData, priority: v as CleaningTask['priority'] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Scheduled Date</Label>
                    <DatePicker
                      selected={taskFormData.scheduledDate}
                      onSelect={(d) => setTaskFormData({ ...taskFormData, scheduledDate: d || new Date() })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Duration (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={taskFormData.estimatedDuration}
                      onChange={(e) => setTaskFormData({ ...taskFormData, estimatedDuration: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <Input
                      value={taskFormData.assignedTo}
                      onChange={(e) => setTaskFormData({ ...taskFormData, assignedTo: e.target.value })}
                      placeholder="Worker ID or Name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Instructions</Label>
                  <Textarea
                    rows={3}
                    value={taskFormData.instructions}
                    onChange={(e) => setTaskFormData({ ...taskFormData, instructions: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Required Supplies</Label>
                    <Input
                      value={taskFormData.requiredSupplies}
                      onChange={(e) => setTaskFormData({ ...taskFormData, requiredSupplies: e.target.value })}
                      placeholder="Cleaner, disinfectant, towels"
                    />
                  </div>
                  <div>
                    <Label>Required Equipment</Label>
                    <Input
                      value={taskFormData.requiredEquipment}
                      onChange={(e) => setTaskFormData({ ...taskFormData, requiredEquipment: e.target.value })}
                      placeholder="Broom, mop, gloves"
                    />
                  </div>
                </div>
                <div>
                  <Label>Selected Spaces ({selectedSpaces.length})</Label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2">
                    {selectedSpaces.length === 0 ? (
                      <p className="text-sm text-gray-500">No spaces selected.</p>
                    ) : (
                      selectedSpaces.map((id) => {
                        const sp = spaces.find((s) => s.id === id)
                        return (
                          <div key={id} className="flex items-center justify-between p-1">
                            <span className="text-sm">{sp?.displayName}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSpaces((prev) => prev.filter((x) => x !== id))}
                            >
                              Remove
                            </Button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreateCleaningTask}
                    disabled={!taskFormData.taskName || selectedSpaces.length === 0}
                  >
                    Create Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{statistics.totalTasks}</p>
              </div>
              <Sparkles className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.pendingTasks}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.inProgressTasks}</p>
              </div>
              <Brush className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{statistics.completedTasks}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Daily</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.dailyTasks}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{statistics.criticalTasks}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Cleaning Tasks</TabsTrigger>
          <TabsTrigger value="spaces">Select Spaces</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* --- التعديل الأول يبدأ هنا --- */}
                <Select value={filters.spaceType} onValueChange={(v) => setFilters({ ...filters, spaceType: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Space Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Meeting Room">Meeting Room</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="Bathroom">Bathroom</SelectItem>
                    <SelectItem value="Cafeteria">Cafeteria</SelectItem>
                  </SelectContent>
                </Select>
                {/* --- التعديل الثاني يبدأ هنا --- */}
                <Select value={filters.taskType} onValueChange={(v) => setFilters({ ...filters, taskType: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Task Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Deep Clean">Deep Clean</SelectItem>
                  </SelectContent>
                </Select>
                {/* --- التعديل الثالث يبدأ هنا --- */}
                <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {/* --- التعديل الرابع يبدأ هنا --- */}
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setFilters({ spaceType: '', priority: '', status: '', assignedTo: '', taskType: '' })}>Clear Filters</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Cleaning Tasks ({filteredTasks.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Space</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTaskTypeIcon(task.taskType)}
                            <div>
                              <div className="font-medium">{task.taskName}</div>
                              <div className="text-sm text-gray-500">{task.taskType}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{task.spaceName}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{task.taskType}</Badge></TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>{task.scheduledDate.toDate().toLocaleDateString()}</TableCell>
                        <TableCell>{task.estimatedDuration} min</TableCell>
                        <TableCell>
                          <Select
                            value={task.status}
                            onValueChange={(v) => updateTaskStatus(task.id, v as CleaningTask['status'])}
                          >
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Skipped">Skipped</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="spaces" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Spaces to Create Cleaning Tasks</CardTitle>
              <CardDescription>Choose the spaces you want to create cleaning tasks for.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSpaces.length === spaces.length && spaces.length > 0}
                      onCheckedChange={(checked) =>
                        checked ? setSelectedSpaces(spaces.map((s) => s.id)) : setSelectedSpaces([])
                      }
                    />
                    <Label>Select All</Label>
                  </div>
                  <Badge variant="outline">{selectedSpaces.length} spaces selected</Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Cleaning Frequency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spaces.map((space) => (
                        <TableRow key={space.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSpaces.includes(space.id)}
                              onCheckedChange={(checked) =>
                                checked
                                  ? setSelectedSpaces([...selectedSpaces, space.id])
                                  : setSelectedSpaces(selectedSpaces.filter((id) => id !== space.id))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{space.displayName}</div>
                              <div className="text-sm text-gray-500">{space.locationCode}</div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{space.spaceType}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={space.status === 'Available' ? 'default' : 'secondary'}>
                              {space.status}
                            </Badge>
                          </TableCell>
                          <TableCell><Badge variant="outline">{space.structure.label}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="outline">{space.cleaningFrequency || 'Not Set'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}