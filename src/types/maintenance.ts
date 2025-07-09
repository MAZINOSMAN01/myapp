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
   Preventive-Maintenance domain (خطط الصيانة)
───────────────────────────────────────────────────────────*/

import type { Timestamp } from 'firebase/firestore'

/** الحمولة التى تُنشأ قبل الحفظ فى Firestore */
export interface NewMaintenancePlan {
  assetId: string
  /** نوع الأصل ضمن النظام (اختياري) */
  assetType?: string
  /** الموقع النصي المعروض لهذا الأصل */
  location?: string
  /** معرّف المساحة المرتبطة إن وجد */
  spaceId?: string
  planName: string
  frequency: Frequency
  firstDueDate: Timestamp        // يحفظ كـ Timestamp فى Firestore
  tasks: string[]
  assignedTo?: string
}

/** خطة صيانة محفوظة بالفعل */
export interface MaintenancePlan extends NewMaintenancePlan {
  id: string
            // يُملأ تلقائياً أو يحدّده المستخدم
  completed?: boolean
}

/* ──────────────────────────────────────────────────────────
   Asset & System-Management domain (إدارة الأنظمة/الأصول)
───────────────────────────────────────────────────────────*/

/** نوع فردى داخل نظام واحد، مع موقع اختيارى */
export interface AssetType {
  spaceId: string
  name: string
  location?: string
}

/** نظام (Asset) يضمّ مجموعة أنواع */
export interface SystemAsset {
  spaceId: string
  id: string
  name: string
  location?: string              // موقع افتراضى للنظام ككلّ (اختياري)
  types: AssetType[]
}

/** اسم مستعار لتوافق المكوّنات القديمة التى تستورد `Asset` */
export type Assets = SystemAsset
