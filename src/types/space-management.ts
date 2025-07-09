// src/types/space-management.ts
import type { Timestamp } from 'firebase/firestore'

/** نوع المساحة */
export type SpaceType = 
  | 'Office'
  | 'Meeting Room'
  | 'Storage'
  | 'Electrical Room'
  | 'Server Room'
  | 'Cafeteria'
  | 'Bathroom'
  | 'Hallway'
  | 'Reception'
  | 'Common Area'
  | 'Parking'
  | 'Other'

/** حالة المساحة */
export type SpaceStatus = 
  | 'Available'
  | 'Occupied'
  | 'Under Maintenance'
  | 'Reserved'
  | 'Out of Service'

/** مستوى الأولوية للصيانة */
export type MaintenancePriority = 
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical'

/** تفاصيل الموقع الهيكلي - متوافق مع Firebase الموجود */
export interface LocationStructure {
  building: string;        // A1, B2, C3, etc.
  floor: number;          // 1, 2, 3, etc.
  space: string;          // OFFICE 13, MEETING ROOM 5, etc.
  label: string;          // Office, Admin, Storage, etc. (سيتم تحويل المصفوفة إلى نص)
}

/** معلومات المساحة الأساسية */
export interface SpaceLocation {
  id: string;
  locationCode: string;              // A1-FLOOR1-OFFICE-13
  displayName: string;               // A1 FLOOR 1 OFFICE 13
  structure: LocationStructure;
  spaceType: SpaceType;
  status: SpaceStatus;
  area: number;                      // المساحة بالمتر المربع
  capacity?: number;                 // عدد الأشخاص المسموح
  department?: string;               // القسم المسؤول
  manager?: string;                  // مدير المساحة
  
  // معلومات إضافية
  description?: string;
  notes?: string;
  
  // معلومات الصيانة
  maintenancePriority: MaintenancePriority;
  lastMaintenance?: Timestamp;
  nextMaintenance?: Timestamp;
  
  // معلومات التنظيف
  cleaningFrequency?: 'Daily' | 'Weekly' | 'Monthly';
  lastCleaning?: Timestamp;
  nextCleaning?: Timestamp;
  
  // تواريخ النظام
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

/** فلتر البحث */
export interface SpaceFilter {
  searchTerm?: string;
  building?: string;
  floor?: string;
  spaceType?: SpaceType;
  status?: SpaceStatus;
  department?: string;
  maintenancePriority?: MaintenancePriority;
}

/** إحصائيات المساحات */
export interface SpaceStatistics {
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  maintenanceSpaces: number;
  totalArea: number;
  utilizationRate: number;
  
  // إحصائيات حسب النوع
  spacesByType: Record<SpaceType, number>;
  
  // إحصائيات حسب الطوابق
  spacesByFloor: Record<string, number>;
  
  // إحصائيات الصيانة
  maintenanceByPriority: Record<MaintenancePriority, number>;
}

/** ربط المساحة بالأصول */
export interface SpaceAssetLink {
  spaceId: string;
  assetId: string;
  assetName: string;
  assetType: string;
  installationDate: Timestamp;
  warrantyExpiry?: Timestamp;
  notes?: string;
}

/** تاريخ الأنشطة */
export interface SpaceActivity {
  id: string;
  spaceId: string;
  activityType: 'Status Change' | 'Maintenance' | 'Cleaning' | 'Asset Added' | 'Asset Removed';
  description: string;
  performedBy: string;
  performedAt: Timestamp;
  details?: any;
}