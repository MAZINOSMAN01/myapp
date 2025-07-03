// functions/src/index.ts
/* eslint-disable @typescript-eslint/no-var-requires */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/* ─── v2 SDKs (جديدة) ───────────────────────────────────── */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

/* المنطق المساعد الذي سنضيفه كموديولات منفصلة */
import { generateWeeklyTasks } from "./modules/generateWeeklyTasks";
import { archiveTasks } from "./modules/archiveTasks";

/* ─── تهيئة Firebase Admin ─────────────────────────────── */
admin.initializeApp();
const db = admin.firestore();

/* ──────────────────────────────────────────────────────────
 * 1) تحديث إحصاءات لوحة التحكم (كودك الأصلي دون تعديل)
 * ──────────────────────────────────────────────────────────*/
export const updateDashboardStats = functions.firestore
  .document("work_orders/{orderId}")
  .onWrite(async (change, _context) => {
    console.log("Work order changed, updating dashboard stats…");

    const workOrdersRef = db.collection("work_orders");
    const snapshot = await workOrdersRef.get();

    let open = 0,
      completed = 0,
      inProgress = 0,
      overdue = 0;
    const now = new Date();

    snapshot.forEach((doc) => {
      const order = doc.data();
      if (
        ["Open", "Pending", "Scheduled", "In Progress"].includes(order.status)
      )
        open++;
      if (order.status === "Completed") completed++;
      if (order.status === "In Progress") inProgress++;

      if (order.dueDate) {
        const due = new Date(order.dueDate);
        if (order.status !== "Completed" && due < now) overdue++;
      }
    });

    const totalUsers = (await db.collection("users").get()).size;

    const stats = {
      openOrders: open,
      completedOrders: completed,
      inProgressOrders: inProgress,
      overdueOrders: overdue,
      totalUsers,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log("Calculated Stats:", stats);
    return db.collection("summaries").doc("dashboard_summary").set(stats);
  });

/* ──────────────────────────────────────────────────────────
 * 2) weeklyTaskGenerator — يولّد مهام الأسابيع القادمة
 *    (يعمل كل إثنين 00:05 UTC)
 * ──────────────────────────────────────────────────────────*/
export const weeklyTaskGenerator = onSchedule(
  {
    schedule: "every monday 00:05",
    timezone: "UTC",
    region: "us-central1",
  },
  async () => generateWeeklyTasks(db)
);

/* ──────────────────────────────────────────────────────────
 * 3) autoArchiveTasks — يؤرشف المهام بعد 14 يوماً من اكتمالها
 *    (Trigger عند أي تحديث لمستند المهمة)
 * ──────────────────────────────────────────────────────────*/
export const autoArchiveTasks = onDocumentUpdated(
  {
    document: "maintenance_plans/{planId}/tasks/{taskId}",
    region: "us-central1",
  },
  (event) => archiveTasks(event)
);
