// functions/src/modules/archiveTasks.ts

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { FirestoreEvent } from "firebase-functions/v2/firestore";

const ARCHIVE_AFTER_DAYS = 14;

/**
 * يؤرشف المهام المكتملة تلقائياً بعد فترة محددة
 * متوافق مع Firebase Functions v2
 */
export async function archiveTasks(
  event: FirestoreEvent<any, { taskId: string }>
): Promise<void> {
  try {
    const taskId = event.params?.taskId;
    if (!taskId) {
      logger.warn("⚠️ Archive task event without taskId");
      return;
    }

    // الحصول على بيانات المهمة بعد التحديث
    const taskData = event.data?.after?.data();
    if (!taskData) {
      logger.warn(`⚠️ No task data found for task ${taskId}`);
      return;
    }

    // التحقق من أن المهمة مكتملة أو مهملة وغير مؤرشفة
    if (!["Completed", "Skipped"].includes(taskData.status)) {
      return; // المهمة ليست مكتملة
    }

    if (taskData.archived) {
      return; // المهمة مؤرشفة بالفعل
    }

    // حساب عدد الأيام منذ اكتمال المهمة
    let completionDate: Date;
    
    if (taskData.completedAt) {
      // استخدام تاريخ الاكتمال إذا كان متاحاً
      completionDate = taskData.completedAt.toDate ? 
        taskData.completedAt.toDate() : 
        new Date(taskData.completedAt);
    } else if (taskData.dueDate) {
      // استخدام تاريخ الاستحقاق كبديل
      completionDate = taskData.dueDate.toDate ? 
        taskData.dueDate.toDate() : 
        new Date(taskData.dueDate);
    } else {
      logger.warn(`⚠️ No completion or due date for task ${taskId}`);
      return;
    }

    const daysSinceCompletion = 
      (Date.now() - completionDate.getTime()) / (1000 * 60 * 60 * 24);

    // التحقق من وصول المهمة لعمر الأرشفة
    if (daysSinceCompletion >= ARCHIVE_AFTER_DAYS) {
      logger.info(`📋 Archiving task ${taskId} after ${Math.round(daysSinceCompletion)} days`);

      const db = admin.firestore();
      
      // تحديث المهمة لتصبح مؤرشفة
      await db.collection("maintenance_tasks").doc(taskId).update({
        archived: true,
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        archivedReason: "Auto-archived after completion"
      });

      logger.info(`✅ Task ${taskId} archived successfully`);
      
      // إضافة سجل في الإحصائيات
      await updateArchiveStats();
      
    } else {
      const remainingDays = ARCHIVE_AFTER_DAYS - daysSinceCompletion;
      logger.info(`ℹ️ Task ${taskId} will be archived in ${Math.ceil(remainingDays)} days`);
    }

  } catch (error) {
    logger.error("❌ Error in archiveTasks function", {
      error: error instanceof Error ? error.message : String(error),
      taskId: event.params?.taskId,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * تحديث إحصائيات الأرشفة
 */
async function updateArchiveStats(): Promise<void> {
  try {
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    
    const statsRef = db.collection("system_stats").doc("archive_stats");
    const statsDoc = await statsRef.get();
    
    if (statsDoc.exists) {
      const currentStats = statsDoc.data() || {};
      const dailyStats = currentStats.daily || {};
      
      // تحديث عداد اليوم
      dailyStats[today] = (dailyStats[today] || 0) + 1;
      
      await statsRef.update({
        daily: dailyStats,
        totalArchived: admin.firestore.FieldValue.increment(1),
        lastArchived: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // إنشاء مستند إحصائيات جديد
      await statsRef.set({
        daily: { [today]: 1 },
        totalArchived: 1,
        lastArchived: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
  } catch (error) {
    logger.error("❌ Error updating archive stats", { error });
    // لا نرمي الخطأ هنا لأن فشل تحديث الإحصائيات لا يجب أن يؤثر على الأرشفة
  }
}