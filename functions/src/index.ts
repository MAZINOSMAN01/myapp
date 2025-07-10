// functions/src/index.ts

// ─── استيرادات Firebase Functions v2 ─────────────────
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// ─── استيرادات Firebase Admin ─────────────────────────────
import * as admin from "firebase-admin";

// ─── الوحدات المساعدة ─────────────────────────────────────
import { generateWeeklyTasks } from "./modules/generateWeeklyTasks";
import { archiveTasks } from "./modules/archiveTasks";
import { deletePlanTasks } from "./modules/deletePlanTasks";
import { updateDashboardStats } from "./modules/updateDashboardStats";

// ─── تهيئة Firebase Admin ──────────────────────────────────
admin.initializeApp();

/* ═══════════════════════════════════════════════════════════════
 *                    SCHEDULED FUNCTIONS
 * ═══════════════════════════════════════════════════════════════ */

/**
 * يولّد مهام الصيانة الوقائية كل إثنين في تمام الساعة 00:05 UTC
 */
export const weeklyTaskGenerator = onSchedule(
  {
    schedule: "5 0 * * 1", // كل إثنين في 00:05 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      logger.info("🚀 Starting weekly task generation...", { 
        eventId: event.scheduleTime,
        timestamp: new Date().toISOString() 
      });
      
      await generateWeeklyTasks();
      
      logger.info("✅ Weekly task generation completed successfully");
    } catch (error) {
      logger.error("❌ Failed to generate weekly tasks", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
);

/**
 * ينظف المهام المنتهية الصلاحية كل يوم في الساعة 02:00 UTC
 */
export const dataCleanupScheduler = onSchedule(
  {
    schedule: "0 2 * * *", // كل يوم في 02:00 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 300,
  },
  async () => {
    try {
      logger.info("🧹 Starting data cleanup...");
      
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const cutoffDate = admin.firestore.Timestamp.fromDate(
        new Date(now.toDate().getTime() - (14 * 24 * 60 * 60 * 1000)) // 14 يوم مضى
      );
      
      // حذف المهام المؤرشفة القديمة
      const oldTasksQuery = await db.collection("maintenance_tasks")
        .where("archived", "==", true)
        .where("archivedAt", "<", cutoffDate)
        .limit(100)
        .get();
      
      if (!oldTasksQuery.empty) {
        const batch = db.batch();
        oldTasksQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        logger.info(`🗑️ Cleaned up ${oldTasksQuery.size} old archived tasks`);
      }
      
      logger.info("✅ Data cleanup completed successfully");
    } catch (error) {
      logger.error("❌ Failed to cleanup data", { error });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
 *                    FIRESTORE TRIGGERS
 * ═══════════════════════════════════════════════════════════════ */

/**
 * يحدث إحصائيات لوحة التحكم عند تغيير أوامر العمل
 */
export const dashboardStatsUpdater = onDocumentUpdated(
  {
    document: "work_orders/{orderId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    try {
      logger.info("📊 Updating dashboard stats...", { 
        orderId: event.params?.orderId 
      });
      
      await updateDashboardStats(event);
      
      logger.info("✅ Dashboard stats updated successfully");
    } catch (error) {
      logger.error("❌ Failed to update dashboard stats", { 
        error,
        orderId: event.params?.orderId 
      });
    }
  }
);

/**
 * يؤرشف المهام المكتملة تلقائياً
 */
export const taskAutoArchiver = onDocumentUpdated(
  {
    document: "maintenance_tasks/{taskId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    try {
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();
      
      // تحقق من تغيير الحالة إلى مكتمل
      if (before?.status !== 'Completed' && after?.status === 'Completed') {
        logger.info("📋 Task completed, starting archiving process...", { 
          taskId: event.params?.taskId 
        });
        
        await archiveTasks(event);
        
        logger.info("✅ Task archiving completed successfully");
      }
    } catch (error) {
      logger.error("❌ Failed to archive task", { 
        error,
        taskId: event.params?.taskId 
      });
    }
  }
);

/**
 * ينظف المهام المرتبطة عند حذف خطة صيانة
 */
export const planDeletionHandler = onDocumentDeleted(
  {
    document: "maintenance_plans/{planId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    try {
      const planId = event.params?.planId;
      if (!planId) {
        logger.warn("⚠️ Plan deletion event without planId");
        return;
      }
      
      logger.info("🗑️ Maintenance plan deleted, cleaning up tasks...", { planId });
      
      await deletePlanTasks(planId);
      
      logger.info("✅ Plan cleanup completed successfully", { planId });
    } catch (error) {
      logger.error("❌ Failed to cleanup deleted plan", { 
        error,
        planId: event.params?.planId 
      });
      throw error;
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
 *                    HTTP FUNCTIONS
 * ═══════════════════════════════════════════════════════════════ */

/**
 * نقطة نهاية لتشغيل توليد المهام يدوياً
 */
export const manualTaskGeneration = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (req, res) => {
    try {
      // التحقق من صحة الطلب
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      logger.info("🔧 Manual task generation requested", { 
        userAgent: req.headers['user-agent'],
        ip: req.ip 
      });
      
      await generateWeeklyTasks();
      
      res.status(200).json({ 
        success: true, 
        message: 'Tasks generated successfully',
        timestamp: new Date().toISOString()
      });
      
      logger.info("✅ Manual task generation completed");
    } catch (error) {
      logger.error("❌ Manual task generation failed", { error });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * نقطة نهاية للحصول على إحصائيات النظام
 */
export const getSystemStats = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      
      const db = admin.firestore();
      
      // إحصائيات المهام
      const tasksSnapshot = await db.collection("maintenance_tasks").get();
      const completedTasks = tasksSnapshot.docs.filter(doc => 
        doc.data().status === 'Completed'
      ).length;
      
      // إحصائيات خطط الصيانة
      const plansSnapshot = await db.collection("maintenance_plans").get();
      const activePlans = plansSnapshot.docs.filter(doc => 
        doc.data().isActive !== false
      ).length;
      
      // إحصائيات أوامر العمل
      const workOrdersSnapshot = await db.collection("work_orders").get();
      const openWorkOrders = workOrdersSnapshot.docs.filter(doc => 
        ['Open', 'Pending', 'In Progress'].includes(doc.data().status)
      ).length;
      
      const stats = {
        totalTasks: tasksSnapshot.size,
        completedTasks,
        pendingTasks: tasksSnapshot.size - completedTasks,
        totalPlans: plansSnapshot.size,
        activePlans,
        inactivePlans: plansSnapshot.size - activePlans,
        totalWorkOrders: workOrdersSnapshot.size,
        openWorkOrders,
        completedWorkOrders: workOrdersSnapshot.size - openWorkOrders,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json(stats);
      
    } catch (error) {
      logger.error("❌ Failed to get system stats", { error });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// إعادة تصدير الوحدات للاستخدام الخارجي
export { generateWeeklyTasks } from "./modules/generateWeeklyTasks";
export { archiveTasks } from "./modules/archiveTasks";
export { deletePlanTasks } from "./modules/deletePlanTasks";
export { updateDashboardStats } from "./modules/updateDashboardStats";