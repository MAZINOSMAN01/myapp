/* ──────────────────────────────────────────────────────────
   Base enums / primitives
───────────────────────────────────────────────────────────*/

/** جميع التكرارات المدعومة لخطط الصيانة الوقائية */
export type Frequency =
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-annually'
  | 'Annually'

/** وثيقة موقع مستقلّة (collection: locations) */
export interface LocationDoc {
  id: string
  name: string
}

/* ──────────────────────────────────────────────────────────
   Advanced Task Management Types - الأنواع المتقدمة لإدارة المهام
───────────────────────────────────────────────────────────*/

import type { Timestamp } from 'firebase/firestore'

/** حالات المهام الموسّعة */
export type TaskStatus = 
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Partially Done'
  | 'Needs Review'
  | 'Skipped'
  | 'Failed'

/** مستويات تقييم الجودة */
export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5

/** مؤقت المهام */
export interface TaskTimer {
  startTime?: Timestamp
  endTime?: Timestamp
  totalDuration: number // بالدقائق
  isPaused: boolean
  pausedDuration: number // إجمالي زمن التوقف
}

/** ملاحظة مهمة */
export interface TaskNote {
  id: string
  text: string
  createdAt: Timestamp
  createdBy: string
}

/** مستويات الأولوية */
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

/** مهمة صيانة متقدمة */
export interface AdvancedMaintenanceTask {
  id: string
  planId: string
  assetId: string
  taskDescription: string
  dueDate: Timestamp
  status: TaskStatus
  type: 'Preventive' | 'Corrective'
  
  // الخصائص المتقدمة الجديدة
  qualityRating?: Exclude<QualityRating, 0> // لا نخزن 0 في القاعدة
  timer: TaskTimer
  priority: Priority
  estimatedDuration?: number // بالدقائق
  notes: TaskNote[]
  
  // معلومات التكليف والإنجاز
  assignedTo?: string
  assignedToName?: string
  completedBy?: string
  completedAt?: Timestamp
  
  // معلومات التكلفة والتتبع
  cost?: number
  actualDuration?: number
  
  // تواريخ التتبع
  createdAt: Timestamp
  lastModified: Timestamp
  createdBy: string
  
  // معلومات إضافية
  completionNotes?: string
  attachments?: string[] // URLs للمرفقات
  location?: string // إضافة الموقع المطلوب
  spaceId?: string // معرف المساحة
  assetType?: string // نوع الأصل
}

/* ──────────────────────────────────────────────────────────
   Preventive-Maintenance domain (خطط الصيانة)
───────────────────────────────────────────────────────────*/

/** الحمولة التى تُنشأ قبل الحفظ فى Firestore */
export interface NewMaintenancePlan {
  assetId: string
  /** نوع الأصل ضمن النظام (اختياري) */
  assetType?: string
  /** أنواع الأصول المحددة للخطة */
  selectedAssetTypes?: string[]
  /** الموقع النصي المعروض لهذا الأصل */
  location?: string
  /** معرّف المساحة المرتبطة إن وجد */
  spaceId?: string
  planName: string
  frequency: Frequency
  firstDueDate: Timestamp        // يحفظ كـ Timestamp فى Firestore
  tasks: string[]
  assignedTo?: string
  
  // خصائص متقدمة جديدة
  priority?: Priority
  estimatedDurationPerTask?: number // بالدقائق
  isActive?: boolean
  lastGenerated?: Timestamp
  description?: string
}

/** خطة صيانة محفوظة بالفعل */
export interface MaintenancePlan extends NewMaintenancePlan {
  scheduleType: any
  id: string
  completed?: boolean
  
  // حقول محسوبة محلياً (لا تُحفظ في Firestore)
  assetName?: string
  totalTasks?: number
  completedTasks?: number
  progressPercentage?: number
}

/* ──────────────────────────────────────────────────────────
   Asset & System-Management domain (إدارة الأنظمة/الأصول)
───────────────────────────────────────────────────────────*/

/** حالة الأصل */
export type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'

/** حالة التشغيل */
export type OperationalStatus = 'Operational' | 'Under Maintenance' | 'Out of Service' | 'Retired'

/** نوع فردى داخل نظام واحد مع تفاصيل مهنية محسّنة */
export interface AssetType {
  // الخصائص الأساسية
  spaceId: string
  name: string
  location?: string
  label?: string      // تسمية فرعية للنوع (Type 1, Type 2, etc.)
  quantity?: number   // كمية هذا النوع
  
  // تفاصيل مهنية محسّنة
  condition: AssetCondition           // حالة الأصل
  operationalStatus: OperationalStatus // حالة التشغيل
  manufacturer?: string               // الشركة المصنعة
  model?: string                     // رقم الموديل
  serialNumber?: string              // الرقم التسلسلي
  purchaseDate?: Timestamp           // تاريخ الشراء
  installationDate?: Timestamp       // تاريخ التركيب
  warrantyExpiry?: Timestamp         // انتهاء الضمان
  purchaseCost?: number             // تكلفة الشراء
  currentValue?: number             // القيمة الحالية
  
  // معلومات التشغيل والصيانة
  lastMaintenanceDate?: Timestamp    // آخر صيانة
  nextMaintenanceDate?: Timestamp    // الصيانة القادمة
  maintenanceInterval?: number       // فترة الصيانة (بالأيام)
  totalMaintenanceCost?: number      // إجمالي تكلفة الصيانة
  downtimeHours?: number            // ساعات التوقف
  
  // معلومات تقنية
  specifications?: Record<string, string> // المواصفات التقنية
  operatingHours?: number           // ساعات التشغيل
  energyRating?: string            // تصنيف الطاقة
  safetyRating?: string           // تصنيف السلامة
  
  // معلومات إضافية
  supplier?: string               // المورد
  department?: string            // القسم المسؤول
  responsiblePerson?: string     // الشخص المسؤول
  notes?: string                // ملاحظات إضافية
  tags?: string[]              // تصنيفات/علامات
  
  // تواريخ التتبع
  createdAt?: Timestamp
  updatedAt?: Timestamp
  createdBy?: string
  updatedBy?: string
}

/** نظام (Asset) محسّن يضمّ مجموعة أنواع مع تفاصيل مهنية */
export interface SystemAsset {
  // الخصائص الأساسية
  spaceId: string
  id: string
  name: string
  location?: string              // موقع افتراضى للنظام ككلّ (اختياري)
  types: AssetType[]
  
  // تفاصيل النظام المهنية
  category?: string              // فئة النظام (HVAC, Electrical, etc.)
  systemCode?: string           // رمز النظام
  description?: string          // وصف النظام
  priority?: Priority          // أولوية النظام
  
  // معلومات التشغيل
  overallCondition?: AssetCondition    // الحالة العامة للنظام
  systemStatus?: OperationalStatus     // حالة النظام العامة
  commissioning?: Timestamp            // تاريخ التشغيل
  lastInspection?: Timestamp           // آخر فحص
  nextInspection?: Timestamp           // الفحص القادم
  
  // معلومات مالية
  totalSystemValue?: number            // القيمة الإجمالية للنظام
  annualMaintenanceBudget?: number     // ميزانية الصيانة السنوية
  
  // معلومات المسؤولية
  systemManager?: string               // مدير النظام
  maintenanceTeam?: string[]          // فريق الصيانة
  department?: string                 // القسم المسؤول
  
  // معلومات أمان ومخاطر
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical'  // مستوى المخاطر
  safetyRequirements?: string[]       // متطلبات السلامة
  emergencyProcedures?: string        // إجراءات الطوارئ
  
  // وثائق ومرفقات
  manuals?: string[]                  // أدلة التشغيل (URLs)
  drawings?: string[]                 // رسوم هندسية (URLs)
  certificates?: string[]             // شهادات (URLs)
  
  // تتبع التحديثات
  createdAt?: Timestamp
  updatedAt?: Timestamp
  createdBy?: string
  updatedBy?: string
  version?: number                    // إصدار البيانات للتتبع
}

/** اسم مستعار لتوافق المكوّنات القديمة التى تستورد `Asset` */
export type Asset = SystemAsset

/* ──────────────────────────────────────────────────────────
   Calendar & Scheduling Types - أنواع التقويم والجدولة
───────────────────────────────────────────────────────────*/

/** حدث التقويم المتقدم */
export interface MaintenanceCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: AdvancedMaintenanceTask
  allDay?: boolean
  
  // خصائص العرض
  color?: string
  textColor?: string
  backgroundColor?: string
  borderColor?: string
  
  // خصائص التفاعل
  isDraggable?: boolean
  isResizable?: boolean
  isSelectable?: boolean
}

/** إعدادات فلترة التقويم */
export interface CalendarFilters {
  status: TaskStatus[] | 'ALL'
  priority: Priority[] | 'ALL'
  assetId: string[] | 'ALL'
  assignedTo: string[] | 'ALL'
  dateRange: {
    start: Date
    end: Date
  }
  showCompleted: boolean
}

/* ──────────────────────────────────────────────────────────
   Statistics & Analytics Types - أنواع الإحصائيات والتحليلات
───────────────────────────────────────────────────────────*/

/** إحصائيات الأداء */
export interface PerformanceStats {
  completionRate: any
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  averageCompletionTime: number
  averageQualityRating: number
  totalCost: number
  
  // إحصائيات حسب الفترة الزمنية
  weeklyCompletion: number[]
  monthlyCompletion: number[]
  
  // إحصائيات حسب النوع
  tasksByStatus: Record<TaskStatus, number>
  tasksByPriority: Record<Priority, number>
  tasksByAsset: Record<string, number>
}

/** تقرير الأداء */
export interface PerformanceReport {
  id: string
  title: string
  generatedAt: Timestamp
  dateRange: {
    start: Date
    end: Date
  }
  stats: PerformanceStats
  recommendations: string[]
  generatedBy: string
}

/* ──────────────────────────────────────────────────────────
   Utility Types - أنواع مساعدة
───────────────────────────────────────────────────────────*/

/** نوع الاستجابة للعمليات */
export interface OperationResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/** خيارات الفلترة العامة */
export interface FilterOptions {
  searchTerm?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/** معلومات المستخدم */
export interface User {
  id: string
  name: string
  email?: string
  role?: string
  department?: string
}