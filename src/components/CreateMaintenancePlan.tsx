// src/components/CreateMaintenancePlan.tsx
// النسخة المُصححة - حل جميع المشاكل

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  PlusCircle, 
  Trash2, 
  Calendar,
  Clock,
  AlertTriangle,
  MapPin,
  Users,
  Settings,
  Save,
  X,
} from "lucide-react";
import { Timestamp, collection, getDocs, addDoc, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useToast } from "@/components/ui/use-toast";

// استيراد الأنواع المحدثة
import type { 
  Asset,
  NewMaintenancePlan,
  MaintenancePlan,
  Frequency,
  Priority,
} from "@/types/maintenance";
import type { SpaceLocation } from "@/types/space-management";

/* ═══════════════════════════════════════════════════════════════
 *                    INTERFACES & TYPES
 * ═══════════════════════════════════════════════════════════════ */

interface User {
  id: string;
  name: string;
  email?: string;
  department?: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  category: string;
}

interface EnhancedPlanFormData {
  // البيانات الأساسية
  assetId: string;
  assetType?: string;
  spaceId?: string;
  location?: string;
  planName: string;
  description?: string;
  frequency: Frequency;
  firstDueDate: string;
  tasks: string[];
  assignedTo?: string;
  
  // الخصائص المتقدمة الجديدة
  priority: Priority;
  estimatedDurationPerTask: number;
  isActive: boolean;
  
  // إعدادات متقدمة
  enableQualityRating: boolean;
  enableCostTracking: boolean;
  enableTimeTracking: boolean;
  autoAssignToTeam: boolean;
  notificationSettings: {
    onTaskCreated: boolean;
    onTaskOverdue: boolean;
    onTaskCompleted: boolean;
  };
}

export interface CreateMaintenancePlanProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  users?: User[];
  onPlanCreated: (plan: NewMaintenancePlan) => Promise<void>;
  editingPlan?: MaintenancePlan | null;
}

// قوالب المهام حسب نوع الأصل
const TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  'HVAC': [
    { id: '1', name: 'فحص المرشحات', description: 'فحص وتغيير مرشحات الهواء', estimatedDuration: 30, category: 'Preventive' },
    { id: '2', name: 'فحص ضغط الفريون', description: 'قياس وفحص ضغط الغاز المبرد', estimatedDuration: 45, category: 'Preventive' },
    { id: '3', name: 'تنظيف الوحدات', description: 'تنظيف الوحدات الداخلية والخارجية', estimatedDuration: 60, category: 'Cleaning' },
  ],
  'Electrical': [
    { id: '4', name: 'فحص التوصيلات', description: 'فحص جميع التوصيلات الكهربائية', estimatedDuration: 40, category: 'Safety' },
    { id: '5', name: 'اختبار القواطع', description: 'اختبار عمل القواطع الكهربائية', estimatedDuration: 30, category: 'Safety' },
  ],
  'Plumbing': [
    { id: '6', name: 'فحص التسريبات', description: 'فحص الأنابيب للبحث عن تسريبات', estimatedDuration: 50, category: 'Preventive' },
    { id: '7', name: 'تنظيف المجاري', description: 'تنظيف وصيانة أنظمة الصرف', estimatedDuration: 90, category: 'Cleaning' },
  ],
};

/* ═══════════════════════════════════════════════════════════════
 *                    MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════ */

export function CreateMaintenancePlan({
  isOpen,
  onClose,
  assets,
  users = [],
  onPlanCreated,
  editingPlan = null,
}: CreateMaintenancePlanProps) {

  /* ═══════════════════════════════════════════════════════════════
   *                       STATE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════ */
  
  const [spaces, setSpaces] = useState<SpaceLocation[]>([]);
  const [formData, setFormData] = useState<EnhancedPlanFormData>({
    assetId: '',
    planName: '',
    description: '',
    frequency: 'Monthly',
    firstDueDate: new Date().toISOString().split('T')[0],
    tasks: [],
    priority: 'Medium',
    estimatedDurationPerTask: 60,
    isActive: true,
    enableQualityRating: true,
    enableCostTracking: false,
    enableTimeTracking: true,
    autoAssignToTeam: false,
    notificationSettings: {
      onTaskCreated: true,
      onTaskOverdue: true,
      onTaskCompleted: false,
    },
  });
  
  const [newTask, setNewTask] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  
  const { toast } = useToast();

  /* ═══════════════════════════════════════════════════════════════
   *                         COMPUTED VALUES
   * ═══════════════════════════════════════════════════════════════ */

  // قائمة الأصول مع الأماكن
  const assetsWithSpaces = useMemo(() => {
    return assets.map(asset => {
      const assetSpaces = spaces.filter(space => 
        space.id === asset.spaceId || 
        asset.types?.some(type => type.spaceId === space.id)
      );
      return { ...asset, availableSpaces: assetSpaces };
    });
  }, [assets, spaces]);

  // الأصل المختار
  const selectedAsset = useMemo(() => {
    return assetsWithSpaces.find(asset => asset.id === formData.assetId);
  }, [assetsWithSpaces, formData.assetId]);

  // قوالب المهام المتاحة
  const availableTemplates = useMemo(() => {
    if (!selectedAsset) return [];
    return TASK_TEMPLATES[selectedAsset.name] || [];
  }, [selectedAsset]);

  // تقدير إجمالي الوقت
  const totalEstimatedTime = useMemo(() => {
    return formData.tasks.length * formData.estimatedDurationPerTask;
  }, [formData.tasks.length, formData.estimatedDurationPerTask]);

  /* ═══════════════════════════════════════════════════════════════
   *                         EFFECTS
   * ═══════════════════════════════════════════════════════════════ */

  // تحميل الأماكن - التصحيح هنا: استخدام 'space_locations' بدلاً من 'spaces'
  useEffect(() => {
    const loadSpaces = async () => {
      if (!isOpen) return;
      
      setLoadingSpaces(true);
      try {
        // ✅ التصحيح: استخدام اسم المجموعة الصحيح
        const spacesSnapshot = await getDocs(collection(db, 'space_locations'));
        const spacesData = spacesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as SpaceLocation[];
        setSpaces(spacesData);
      } catch (error) {
        console.error('Error loading spaces:', error);
        // عدم إظهار رسالة خطأ إذا كانت المجموعة غير موجودة
        setSpaces([]);
      } finally {
        setLoadingSpaces(false);
      }
    };

    loadSpaces();
  }, [isOpen]);

  // تعبئة النموذج عند التحرير
  useEffect(() => {
    if (editingPlan && isOpen) {
      setFormData({
        assetId: editingPlan.assetId,
        assetType: editingPlan.assetType,
        spaceId: editingPlan.spaceId,
        location: editingPlan.location,
        planName: editingPlan.planName,
        description: editingPlan.description || '',
        frequency: editingPlan.frequency,
        firstDueDate: editingPlan.firstDueDate.toDate().toISOString().split('T')[0],
        tasks: editingPlan.tasks || [],
        assignedTo: editingPlan.assignedTo,
        priority: editingPlan.priority || 'Medium',
        estimatedDurationPerTask: editingPlan.estimatedDurationPerTask || 60,
        isActive: editingPlan.isActive !== false,
        enableQualityRating: true,
        enableCostTracking: false,
        enableTimeTracking: true,
        autoAssignToTeam: false,
        notificationSettings: {
          onTaskCreated: true,
          onTaskOverdue: true,
          onTaskCompleted: false,
        },
      });
    } else {
      // إعادة تعيين النموذج عند الإنشاء الجديد
      setFormData({
        assetId: '',
        planName: '',
        description: '',
        frequency: 'Monthly',
        firstDueDate: new Date().toISOString().split('T')[0],
        tasks: [],
        priority: 'Medium',
        estimatedDurationPerTask: 60,
        isActive: true,
        enableQualityRating: true,
        enableCostTracking: false,
        enableTimeTracking: true,
        autoAssignToTeam: false,
        notificationSettings: {
          onTaskCreated: true,
          onTaskOverdue: true,
          onTaskCompleted: false,
        },
      });
    }
  }, [editingPlan, isOpen]);

  // تحديث بيانات الأصل عند تغيير الاختيار
  useEffect(() => {
    const asset = assetsWithSpaces.find(a => a.id === formData.assetId);
    if (asset) {
      setFormData(prev => ({
        ...prev,
        assetType: asset.types?.[0]?.name || '',
        spaceId: asset.spaceId || '',
        location: asset.location || '',
        tasks: [], // مسح المهام عند تغيير الأصل
      }));
      setSelectedTemplates([]);
    }
  }, [formData.assetId, assetsWithSpaces]);

  /* ═══════════════════════════════════════════════════════════════
   *                         EVENT HANDLERS
   * ═══════════════════════════════════════════════════════════════ */

  // إضافة مهمة جديدة
  const handleAddTask = useCallback(() => {
    if (newTask.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask.trim()]
      }));
      setNewTask('');
    }
  }, [newTask]);

  // حذف مهمة
  const handleRemoveTask = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  }, []);

  // إضافة قوالب مهام
  const handleAddTemplates = useCallback(() => {
    const templatesToAdd = availableTemplates
      .filter(template => selectedTemplates.includes(template.id))
      .map(template => template.name);
    
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, ...templatesToAdd]
    }));
    setSelectedTemplates([]);
  }, [availableTemplates, selectedTemplates]);

  // دالة مساعدة لإزالة القيم undefined
  const cleanUndefinedValues = (obj: any): any => {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  };

  // دالة توليد المهام الفورية للخطة الجديدة
  const generateImmediateTasks = async (planId: string, planData: any) => {
    try {
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      
      // حساب أول موعد استحقاق
      const firstDue = new Date(planData.firstDueDate.toDate());
      
      // إذا كان الموعد الأول خلال الأسبوع القادم، قم بتوليد المهام
      if (firstDue <= nextWeek) {
        const batch = writeBatch(db);
        let tasksGenerated = 0;
        
        planData.tasks.forEach((taskDescription: string) => {
          const newTaskRef = doc(collection(db, 'maintenance_tasks'));
          batch.set(newTaskRef, {
            planId: planId,
            assetId: planData.assetId,
            taskDescription,
            type: 'Preventive',
            status: 'Pending',
            dueDate: planData.firstDueDate,
            priority: planData.priority || 'Medium',
            estimatedDuration: planData.estimatedDurationPerTask || 60,
            timer: {
              totalDuration: 0,
              isPaused: false,
              pausedDuration: 0,
            },
            notes: [],
            attachments: [],
            assignedTo: planData.assignedTo || null,
            createdAt: Timestamp.now(),
            lastModified: Timestamp.now(),
            createdBy: 'plan_creation_auto',
          });
          tasksGenerated++;
        });
        
        if (tasksGenerated > 0) {
          await batch.commit();
          toast({
            title: 'Tasks Generated ✅',
            description: `${tasksGenerated} initial tasks created and ready for the checklist.`,
          });
        }
      }
    } catch (error) {
      console.error('Error generating immediate tasks:', error);
      toast({
        title: 'Tasks Generation Warning',
        description: 'Plan created successfully, but failed to generate initial tasks. Use "Generate Tasks" button.',
        variant: 'default',
      });
    }
  };

  // حفظ الخطة
  const handleSubmit = async () => {
    // التحقق من صحة البيانات
    if (!formData.assetId || !formData.planName || !formData.firstDueDate || formData.tasks.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields and add at least one task.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // إنشاء بيانات الخطة مع تنظيف القيم undefined
      const basePlanData = {
        assetId: formData.assetId,
        planName: formData.planName,
        frequency: formData.frequency,
        firstDueDate: Timestamp.fromDate(new Date(formData.firstDueDate)),
        tasks: formData.tasks,
        priority: formData.priority,
        estimatedDurationPerTask: formData.estimatedDurationPerTask,
        isActive: formData.isActive,
      };

      // إضافة الحقول الاختيارية فقط إذا كانت موجودة
      const optionalFields = cleanUndefinedValues({
        assetType: formData.assetType,
        spaceId: formData.spaceId,
        location: formData.location,
        description: formData.description,
        assignedTo: formData.assignedTo && formData.assignedTo !== 'unassigned' ? formData.assignedTo : undefined,
      });

      const planData = { ...basePlanData, ...optionalFields };

      if (editingPlan) {
        // تحديث الخطة الموجودة
        const updateData = cleanUndefinedValues({
          ...planData,
          lastModified: Timestamp.now(),
        });
        await updateDoc(doc(db, 'maintenance_plans', editingPlan.id), updateData);
      } else {
        // إنشاء خطة جديدة
        const createData = cleanUndefinedValues({
          ...planData,
          createdAt: Timestamp.now(),
          lastModified: Timestamp.now(),
          lastGenerated: Timestamp.fromDate(new Date(0)), // لم يتم التوليد بعد
        });
        const docRef = await addDoc(collection(db, 'maintenance_plans'), createData);
        
        // ✅ توليد فوري للمهام الأولى
        await generateImmediateTasks(docRef.id, planData);
      }

      await onPlanCreated(planData as NewMaintenancePlan);
      onClose();

      toast({
        title: 'Success',
        description: `Maintenance plan ${editingPlan ? 'updated' : 'created'} successfully.`,
      });

    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingPlan ? 'update' : 'create'} maintenance plan.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
   *                         RENDER
   * ═══════════════════════════════════════════════════════════════ */

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {editingPlan ? 'Edit Maintenance Plan' : 'Create Advanced Maintenance Plan'}
          </DialogTitle>
          {/* ✅ التصحيح: إضافة DialogDescription لحل تحذير accessibility */}
          <DialogDescription>
            Create a comprehensive maintenance plan with advanced scheduling and tracking features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات الأصل الأساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* اختيار الأصل */}
                <div className="space-y-2">
                  <Label htmlFor="asset">Asset *</Label>
                  <Select 
                    value={formData.assetId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assetId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* ✅ التصحيح: التأكد من أن كل SelectItem له قيمة value صحيحة */}
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id || 'unknown'}>
                          {asset.name} - {asset.location || 'No location'}
                        </SelectItem>
                      ))}
                      {assets.length === 0 && (
                        <SelectItem value="no-assets" disabled>
                          No assets available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* اسم الخطة */}
                <div className="space-y-2">
                  <Label htmlFor="planName">Plan Name *</Label>
                  <Input
                    id="planName"
                    value={formData.planName}
                    onChange={(e) => setFormData(prev => ({ ...prev, planName: e.target.value }))}
                    placeholder="Enter plan name"
                  />
                </div>

                {/* التكرار */}
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: Frequency) => setFormData(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* ✅ التصحيح: التأكد من أن كل SelectItem له قيمة value صحيحة وغير فارغة */}
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Semi-annually">Semi-annually</SelectItem>
                      <SelectItem value="Annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* التاريخ الأول */}
                <div className="space-y-2">
                  <Label htmlFor="firstDueDate">First Due Date *</Label>
                  <Input
                    id="firstDueDate"
                    type="date"
                    value={formData.firstDueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstDueDate: e.target.value }))}
                  />
                </div>

                {/* الأولوية */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* ✅ التصحيح: التأكد من أن كل SelectItem له قيمة value صحيحة وغير فارغة */}
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* المستخدم المعين */}
                {users.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assigned To</Label>
                    <Select
                      value={formData.assignedTo || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value || undefined }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to user" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* ✅ التصحيح: إضافة خيار عدم التعيين */}
                        <SelectItem value="unassigned">No assignment</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id || 'unknown'}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* الوصف */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter plan description"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* إدارة المهام */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tasks Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* إضافة قوالب المهام */}
              {availableTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label>Task Templates</Label>
                  <div className="space-y-2">
                    {availableTemplates.map((template) => (
                      <div key={template.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={template.id}
                          checked={selectedTemplates.includes(template.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTemplates(prev => [...prev, template.id]);
                            } else {
                              setSelectedTemplates(prev => prev.filter(id => id !== template.id));
                            }
                          }}
                        />
                        <Label htmlFor={template.id} className="text-sm">
                          {template.name} - {template.description}
                        </Label>
                        <Badge variant="secondary">{template.estimatedDuration}min</Badge>
                      </div>
                    ))}
                    {selectedTemplates.length > 0 && (
                      <Button onClick={handleAddTemplates} variant="outline" size="sm">
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Add Selected Templates
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* إضافة مهمة مخصصة */}
              <div className="space-y-2">
                <Label htmlFor="newTask">Add Custom Task</Label>
                <div className="flex gap-2">
                  <Input
                    id="newTask"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Enter task description"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                  />
                  <Button onClick={handleAddTask} variant="outline" size="sm">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* قائمة المهام */}
              <div className="space-y-2">
                <Label>Tasks ({formData.tasks.length})</Label>
                {formData.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {formData.tasks.map((task, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{task}</span>
                        <Button
                          onClick={() => handleRemoveTask(index)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* تقدير الوقت */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedDuration">Estimated Duration per Task (minutes)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    min="1"
                    value={formData.estimatedDurationPerTask}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedDurationPerTask: parseInt(e.target.value) || 60 }))}
                  />
                </div>
                <div className="flex items-end">
                  <div className="text-sm text-muted-foreground">
                    Total estimated time: {Math.floor(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الإعدادات المتقدمة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Settings
                </div>
                <Button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  variant="ghost"
                  size="sm"
                >
                  {showAdvancedSettings ? 'Hide' : 'Show'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showAdvancedSettings && (
              <CardContent className="space-y-4">
                {/* إعدادات التتبع */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableQualityRating"
                      checked={formData.enableQualityRating}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableQualityRating: !!checked }))}
                    />
                    <Label htmlFor="enableQualityRating">Enable Quality Rating</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableTimeTracking"
                      checked={formData.enableTimeTracking}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableTimeTracking: !!checked }))}
                    />
                    <Label htmlFor="enableTimeTracking">Enable Time Tracking</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableCostTracking"
                      checked={formData.enableCostTracking}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableCostTracking: !!checked }))}
                    />
                    <Label htmlFor="enableCostTracking">Enable Cost Tracking</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                    />
                    <Label htmlFor="isActive">Plan is Active</Label>
                  </div>
                </div>

                {/* إعدادات الإشعارات */}
                <div className="space-y-3">
                  <Label>Notification Settings</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyTaskCreated"
                        checked={formData.notificationSettings.onTaskCreated}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            onTaskCreated: !!checked
                          }
                        }))}
                      />
                      <Label htmlFor="notifyTaskCreated">Task Created</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyTaskOverdue"
                        checked={formData.notificationSettings.onTaskOverdue}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            onTaskOverdue: !!checked
                          }
                        }))}
                      />
                      <Label htmlFor="notifyTaskOverdue">Task Overdue</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyTaskCompleted"
                        checked={formData.notificationSettings.onTaskCompleted}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            onTaskCompleted: !!checked
                          }
                        }))}
                      />
                      <Label htmlFor="notifyTaskCompleted">Task Completed</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* معلومات الأصل المختار */}
          {selectedAsset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Asset Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Name:</strong> {selectedAsset.name}
                  </div>
                  <div>
                    <strong>Location:</strong> {selectedAsset.location || 'Not specified'}
                  </div>
                  <div>
                    <strong>Types:</strong> {selectedAsset.types?.length || 0} configured
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button onClick={onClose} variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || formData.tasks.length === 0}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {editingPlan ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}