// src/components/CreateMaintenancePlan.tsx
// نسخة محسنة مع دعم الخصائص المتقدمة للمهام

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
import { Timestamp, collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
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
  editingPlan?: MaintenancePlan;
}

/* ═══════════════════════════════════════════════════════════════
 *                    PREDEFINED TEMPLATES
 * ═══════════════════════════════════════════════════════════════ */

const TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  HVAC: [
    { id: '1', name: 'Filter Replacement', description: 'Replace air filters', estimatedDuration: 30, category: 'Routine' },
    { id: '2', name: 'Coil Cleaning', description: 'Clean evaporator and condenser coils', estimatedDuration: 90, category: 'Deep Clean' },
    { id: '3', name: 'Belt Inspection', description: 'Inspect and adjust drive belts', estimatedDuration: 20, category: 'Inspection' },
    { id: '4', name: 'Thermostat Calibration', description: 'Check and calibrate thermostats', estimatedDuration: 45, category: 'Calibration' },
    { id: '5', name: 'Ductwork Inspection', description: 'Inspect ductwork for leaks and damage', estimatedDuration: 60, category: 'Inspection' },
  ],
  Electrical: [
    { id: '6', name: 'Panel Inspection', description: 'Inspect electrical panels and connections', estimatedDuration: 45, category: 'Safety' },
    { id: '7', name: 'Circuit Testing', description: 'Test circuit breakers and GFCIs', estimatedDuration: 30, category: 'Testing' },
    { id: '8', name: 'Lighting Inspection', description: 'Check lighting systems and replace bulbs', estimatedDuration: 25, category: 'Routine' },
    { id: '9', name: 'Emergency Power Test', description: 'Test backup generators and UPS systems', estimatedDuration: 120, category: 'Critical' },
  ],
  Plumbing: [
    { id: '10', name: 'Leak Inspection', description: 'Check for water leaks and drips', estimatedDuration: 40, category: 'Inspection' },
    { id: '11', name: 'Drain Cleaning', description: 'Clean and clear drainage systems', estimatedDuration: 60, category: 'Cleaning' },
    { id: '12', name: 'Water Pressure Test', description: 'Test water pressure throughout building', estimatedDuration: 35, category: 'Testing' },
    { id: '13', name: 'Fixture Maintenance', description: 'Service faucets, toilets, and fixtures', estimatedDuration: 50, category: 'Maintenance' },
  ],
  Security: [
    { id: '14', name: 'Camera System Check', description: 'Test surveillance cameras and recording', estimatedDuration: 40, category: 'Technology' },
    { id: '15', name: 'Access Control Test', description: 'Test keycards and access control systems', estimatedDuration: 30, category: 'Technology' },
    { id: '16', name: 'Alarm System Test', description: 'Test fire and security alarm systems', estimatedDuration: 45, category: 'Critical' },
  ],
  Cleaning: [
    { id: '17', name: 'Deep Clean Common Areas', description: 'Thorough cleaning of lobbies and corridors', estimatedDuration: 120, category: 'Deep Clean' },
    { id: '18', name: 'Window Cleaning', description: 'Clean interior and exterior windows', estimatedDuration: 90, category: 'Routine' },
    { id: '19', name: 'Carpet Deep Clean', description: 'Steam clean carpeted areas', estimatedDuration: 180, category: 'Deep Clean' },
    { id: '20', name: 'Restroom Sanitization', description: 'Deep sanitization of restroom facilities', estimatedDuration: 45, category: 'Sanitization' },
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
  editingPlan,
}: CreateMaintenancePlanProps) {
  
  /* ═══════════════════════════════════════════════════════════════
   *                         STATE MANAGEMENT
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

  // تحميل الأماكن
  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const spacesSnapshot = await getDocs(collection(db, 'spaces'));
        const spacesData = spacesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as SpaceLocation[];
        setSpaces(spacesData);
      } catch (error) {
        console.error('Error loading spaces:', error);
      }
    };

    if (isOpen) {
      loadSpaces();
    }
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
    } else if (!editingPlan && isOpen) {
      // إعادة تعيين النموذج للإنشاء الجديد
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

  /* ═══════════════════════════════════════════════════════════════
   *                         EVENT HANDLERS
   * ═══════════════════════════════════════════════════════════════ */

  // إضافة مهمة جديدة
  const handleAddTask = useCallback(() => {
    if (newTask.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask.trim()],
      }));
      setNewTask('');
    }
  }, [newTask]);

  // حذف مهمة
  const handleRemoveTask = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  }, []);

  // إضافة قوالب المهام
  const handleAddTemplates = useCallback(() => {
    const templatesToAdd = availableTemplates.filter(template => 
      selectedTemplates.includes(template.id)
    );
    
    const newTasks = templatesToAdd.map(template => template.description);
    const avgDuration = templatesToAdd.length > 0 
      ? Math.round(templatesToAdd.reduce((sum, t) => sum + t.estimatedDuration, 0) / templatesToAdd.length)
      : formData.estimatedDurationPerTask;

    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, ...newTasks],
      estimatedDurationPerTask: avgDuration,
    }));
    
    setSelectedTemplates([]);
    
    toast({
      title: 'Templates Added',
      description: `Added ${newTasks.length} task templates to the plan.`,
    });
  }, [selectedTemplates, availableTemplates, formData.estimatedDurationPerTask, toast]);

  // تحديث الموقع عند تغيير الأصل
  const handleAssetChange = useCallback((assetId: string) => {
    const asset = assetsWithSpaces.find(a => a.id === assetId);
    setFormData(prev => ({
      ...prev,
      assetId,
      assetType: asset?.types?.[0]?.name || '',
      spaceId: asset?.spaceId || '',
      location: asset?.location || '',
      tasks: [], // مسح المهام عند تغيير الأصل
    }));
    setSelectedTemplates([]);
  }, [assetsWithSpaces]);

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
      const planData: NewMaintenancePlan = {
        assetId: formData.assetId,
        assetType: formData.assetType,
        spaceId: formData.spaceId,
        location: formData.location,
        planName: formData.planName,
        frequency: formData.frequency,
        firstDueDate: Timestamp.fromDate(new Date(formData.firstDueDate)),
        tasks: formData.tasks,
        assignedTo: formData.assignedTo,
        
        // الخصائص المتقدمة الجديدة
        priority: formData.priority,
        estimatedDurationPerTask: formData.estimatedDurationPerTask,
        isActive: formData.isActive,
        description: formData.description,
      };

      if (editingPlan) {
        // تحديث الخطة الموجودة
        await updateDoc(doc(db, 'maintenance_plans', editingPlan.id), {
          ...planData,
          lastModified: Timestamp.now(),
        });
      } else {
        // إنشاء خطة جديدة
        await addDoc(collection(db, 'maintenance_plans'), {
          ...planData,
          createdAt: Timestamp.now(),
          lastModified: Timestamp.now(),
          lastGenerated: Timestamp.fromDate(new Date(0)), // لم يتم التوليد بعد
        });
      }

      await onPlanCreated(planData);
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
          <DialogDescription>
            Create a comprehensive maintenance plan with advanced scheduling and tracking features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Asset System *</Label>
                  <Select value={formData.assetId} onValueChange={handleAssetChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset system" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetsWithSpaces.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <div className="flex flex-col">
                            <span>{asset.name}</span>
                            {asset.location && (
                              <span className="text-sm text-gray-500">{asset.location}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Plan Name *</Label>
                  <Input
                    value={formData.planName}
                    onChange={(e) => setFormData(prev => ({ ...prev, planName: e.target.value }))}
                    placeholder="e.g., Monthly HVAC Maintenance"
                  />
                </div>

                <div>
                  <Label>Frequency *</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(value: Frequency) => setFormData(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Semi-annually">Semi-annually</SelectItem>
                      <SelectItem value="Annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>First Due Date *</Label>
                  <Input
                    type="date"
                    value={formData.firstDueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstDueDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: Priority) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">🟢 Low</SelectItem>
                      <SelectItem value="Medium">🟡 Medium</SelectItem>
                      <SelectItem value="High">🟠 High</SelectItem>
                      <SelectItem value="Critical">🔴 Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Assigned To</Label>
                  <Select 
                    value={formData.assignedTo || ''} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the maintenance plan..."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* قوالب المهام */}
          {availableTemplates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Templates</CardTitle>
                <p className="text-sm text-gray-600">
                  Quick-start templates for {selectedAsset?.name} maintenance
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
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
                      <Label htmlFor={template.id} className="text-sm cursor-pointer">
                        <div>
                          <span className="font-medium">{template.name}</span>
                          <div className="text-xs text-gray-500">
                            {template.description} ({template.estimatedDuration}m)
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedTemplates.length > 0 && (
                  <Button onClick={handleAddTemplates} variant="outline" size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Selected Templates ({selectedTemplates.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* قائمة المهام */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Maintenance Tasks</CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>📋 {formData.tasks.length} tasks</span>
                <span>⏱️ ~{Math.round(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m total</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* إضافة مهمة جديدة */}
              <div className="flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Enter a maintenance task..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button onClick={handleAddTask} disabled={!newTask.trim()}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* قائمة المهام */}
              <div className="space-y-2">
                {formData.tasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm">{task}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTask(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.tasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No tasks added yet. Add tasks manually or use templates above.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* إعدادات متقدمة */}
          <Card>
            <CardHeader>
              <CardTitle 
                className="text-lg cursor-pointer flex items-center justify-between"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              >
                <span>Advanced Settings</span>
                <Button variant="ghost" size="sm">
                  {showAdvancedSettings ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {showAdvancedSettings && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Duration per Task (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.estimatedDurationPerTask}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estimatedDurationPerTask: parseInt(e.target.value) || 60 
                      }))}
                      min="1"
                      max="480"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        isActive: checked as boolean 
                      }))}
                    />
                    <Label htmlFor="isActive">Plan is Active</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableQualityRating"
                      checked={formData.enableQualityRating}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        enableQualityRating: checked as boolean 
                      }))}
                    />
                    <Label htmlFor="enableQualityRating">Enable Quality Rating</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableTimeTracking"
                      checked={formData.enableTimeTracking}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        enableTimeTracking: checked as boolean 
                      }))}
                    />
                    <Label htmlFor="enableTimeTracking">Enable Time Tracking</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableCostTracking"
                      checked={formData.enableCostTracking}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        enableCostTracking: checked as boolean 
                      }))}
                    />
                    <Label htmlFor="enableCostTracking">Enable Cost Tracking</Label>
                  </div>
                </div>

                {/* إعدادات الإشعارات */}
                <div className="border-t pt-4">
                  <Label className="text-base font-medium">Notification Settings</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="onTaskCreated"
                        checked={formData.notificationSettings.onTaskCreated}
                        onCheckedChange={(checked) => setFormData(prev => ({ 
                          ...prev, 
                          notificationSettings: {
                            ...prev.notificationSettings,
                            onTaskCreated: checked as boolean
                          }
                        }))}
                      />
                      <Label htmlFor="onTaskCreated" className="text-sm">Notify when tasks are created</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="onTaskOverdue"
                        checked={formData.notificationSettings.onTaskOverdue}
                        onCheckedChange={(checked) => setFormData(prev => ({ 
                          ...prev, 
                          notificationSettings: {
                            ...prev.notificationSettings,
                            onTaskOverdue: checked as boolean
                          }
                        }))}
                      />
                      <Label htmlFor="onTaskOverdue" className="text-sm">Notify when tasks become overdue</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="onTaskCompleted"
                        checked={formData.notificationSettings.onTaskCompleted}
                        onCheckedChange={(checked) => setFormData(prev => ({ 
                          ...prev, 
                          notificationSettings: {
                            ...prev.notificationSettings,
                            onTaskCompleted: checked as boolean
                          }
                        }))}
                      />
                      <Label htmlFor="onTaskCompleted" className="text-sm">Notify when tasks are completed</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* ملخص الخطة */}
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">Plan Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Tasks:</span>
                  <div className="text-lg font-bold">{formData.tasks.length}</div>
                </div>
                <div>
                  <span className="font-medium">Estimated Time:</span>
                  <div className="text-lg font-bold">
                    {Math.round(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m
                  </div>
                </div>
                <div>
                  <span className="font-medium">Frequency:</span>
                  <div className="text-lg font-bold">{formData.frequency}</div>
                </div>
                <div>
                  <span className="font-medium">Priority:</span>
                  <div className="text-lg font-bold">
                    <Badge className={
                      formData.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                      formData.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                      formData.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {formData.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.assetId || !formData.planName || formData.tasks.length === 0}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {editingPlan ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}