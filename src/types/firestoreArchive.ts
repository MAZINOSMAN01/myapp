// src/types/firestoreArchive.ts
// ────────────────────────────────────────────────────────────────
// تعريف الواجهات والمحوِّل العام لتحويل مستندات Firestore إلى أنواع قوية
// استيرد هذا الملف في المكوّنات أو Cloud Functions لضمان Type‑Safety
// ────────────────────────────────────────────────────────────────

/*
 * إذا كنت تستعمل SDK المتصفح v9 (modular):
 *   – اترك الأنواع كما هي (Timestamp من firebase/firestore)
 * إذا كنت تستعمل Admin SDK داخل Cloud Functions:
 *   – غيِّر FirebaseFirestore.Timestamp إلى admin.firestore.Timestamp
 */

import { Timestamp, FirestoreDataConverter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

/* ─── 1) الواجهات لكل مجموعة ─────────────────────────────── */
export interface MaintenanceTaskDoc {
  taskDescription: string;
  description?: string;
  status: string;
  completedAt: Timestamp | null;
  archivedAt: Timestamp | null;
  cost?: number;
  assignedTo?: string;
  assetName?: string;
  completedBy?: string;
}

export interface WorkOrderDoc {
  title: string;
  notes?: string;
  status: string;
  completedAt: Timestamp | null;
  closedAt: Timestamp | null;
  cost?: number;
  assignedTo?: string;
  assetName?: string;
  completedBy?: string;
}

export interface IssueLogDoc {
  issueDescription: string;
  actionTaken?: string;
  status: string;
  resolutionDate: Timestamp | null;
  archivedAt: Timestamp | null;
  cost?: number;
  resolvedBy?: string;
  assetName?: string;
}

export interface InspectionRecordDoc {
  title: string;
  description?: string;
  status: string;
  completedAt: Timestamp | null;
  updatedAt: Timestamp | null;
  cost?: number;
  assignedTo?: string;
  assetName?: string;
  completedBy?: string;
}

/* ─── 2) محوِّل عام لربط الواجهة بالمجموعة ────────────────── */
export const genericConverter = <T extends DocumentData>(): FirestoreDataConverter<T> => ({
  toFirestore(data: T) {
    return data as DocumentData;
  },
  fromFirestore(snap: QueryDocumentSnapshot) {
    return snap.data() as T;
  }
});

// ────────────────────────────────────────────────────────────────
// نهاية الملف
// ────────────────────────────────────────────────────────────────
