/* eslint-disable @typescript-eslint/no-var-requires */

// ─── استيرادات أساسية ─────────────────────────────────────
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ─── الوحدات المساعدة الجديدة ─────────────────────────────
import { generateWeeklyTasks } from "./modules/generateWeeklyTasks";
import { archiveTasks } from "./modules/archiveTasks";

// ─── تهيئة Admin ──────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();

/* 1) كودك الأصلي: updateDashboardStats (بدون أي تعديل) */
export const updateDashboardStats = functions.firestore
  .document("work_orders/{orderId}")
  .onWrite(async (_change, _ctx) => {
    // … (الكود كما كان تماماً)
  });

/* 2) weeklyTaskGenerator — يعمل كل إثنين 00:05 UTC */
export const weeklyTaskGenerator = functions.pubsub
  .schedule("0 5 * * 1")   // كرون: الدقيقة 0، الساعة 5 UTC، يوم الإثنين
  .timeZone("UTC")
  .onRun(async () => {
    await generateWeeklyTasks(db);
  });

/* 3) autoArchiveTasks — Trigger عند تحديث كل مهمة */
export const autoArchiveTasks = functions.firestore
  .document("maintenance_plans/{planId}/tasks/{taskId}")
  .onUpdate((change, context) => archiveTasks(change, context));
