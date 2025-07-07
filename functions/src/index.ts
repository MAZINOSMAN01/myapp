// functions/src/index.ts

// ─── استيرادات Firebase Functions v2 (المحسّنة) ─────────────────
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
 * يعمل على إنشاء مهام جديدة للأسبوع القادم بناءً على خطط الصيانة النشطة
 */
export const weeklyTaskGenerator = onSchedule(
  {
    schedule: "5 0 * * 1", // كل إثنين في 00:05 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 دقائق للعمليات الكبيرة
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
      throw error; // إعادة رمي الخطأ لتتبع الفشل في Cloud Console
    }
  }
);

/**
 * ينظف البيانات القديمة والمهام المؤرشفة كل يوم أحد في 02:00 UTC
 * يحذف المهام المكتملة التي مضى عليها أكثر من 90 يوماً
 */
export const dataCleanupScheduler = onSchedule(
  {
    schedule: "0 2 * * 0", // كل أحد في 02:00 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    try {
      logger.info("🧹 Starting data cleanup...");
      
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const cutoffDate = new Date(now.toDate().getTime() - (90 * 24 * 60 * 60 * 1000));
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);
      
      // حذف المهام المكتملة القديمة
      const oldTasksQuery = db.collection('maintenance_tasks')
        .where('status', '==', 'Completed')
        .where('completedAt', '<', cutoffTimestamp)
        .limit(500); // معالجة دفعية لتجنب التحميل الزائد
      
      const oldTasksSnapshot = await oldTasksQuery.get();
      
      if (!oldTasksSnapshot.empty) {
        const batch = db.batch();
        oldTasksSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        logger.info(`🗑️ Deleted ${oldTasksSnapshot.size} old completed tasks`);
      }
      
      logger.info("✅ Data cleanup completed successfully");
    } catch (error) {
      logger.error("❌ Failed to perform data cleanup", { error });
      throw error;
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
 *                    FIRESTORE TRIGGERS
 * ═══════════════════════════════════════════════════════════════ */

/**
 * يُحدّث إحصائيات لوحة التحكم عند تغيير حالة طلبات العمل
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
      // لا نرمي الخطأ هنا لأن فشل تحديث الإحصائيات لا يجب أن يؤثر على العملية الأصلية
    }
  }
);

/**
 * يؤرشف المهام المكتملة تلقائياً بعد فترة محددة
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
        
        // ⭐ إصلاح: تمرير event فقط (متوافق مع v2)
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
 * نقطة نهاية لتشغيل توليد المهام يدوياً (للاختبار والطوارئ)
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
      
      // يمكن إضافة التحقق من الهوية هنا
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
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
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * نقطة نهاية لتوليد تقارير الأرشيف (للبيانات التاريخية)
 */
export const generateArchiveReport = onRequest(
  {
    region: "us-central1",
    memory: "1GiB", // ذاكرة أكبر للتعامل مع كميات كبيرة من البيانات
    timeoutSeconds: 540, // 9 دقائق للتقارير الكبيرة
  },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // التحقق من الهوية
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        reportType = 'maintenance',
        dateFrom,
        dateTo,
        status = 'all',
        includeFinancials = true,
        format = 'json',
        requestedBy = 'unknown'
      } = req.body;

      logger.info("📊 Archive report generation requested", {
        reportType,
        dateRange: `${dateFrom} to ${dateTo}`,
        requestedBy,
        userAgent: req.headers['user-agent']
      });

      // استيراد الوحدة محلياً لتجنب مشاكل التبعيات
      const { generateArchiveReport: generateReport, convertToCSV } = 
        await import('./modules/archiveReportsGenerator.js');

      const reportData = await generateReport({
        reportType,
        dateFrom,
        dateTo,
        status,
        includeFinancials,
        format,
        requestedBy
      });

      if (!reportData.success) {
        res.status(500).json({
          error: 'Report generation failed',
          details: reportData.error
        });
        return;
      }

      // إرسال الاستجابة حسب التنسيق المطلوب
      if (format === 'csv') {
        const csvContent = convertToCSV(reportData.data || []);
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition', 
          `attachment; filename="archive_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv"`
        );
        res.status(200).send('\uFEFF' + csvContent); // BOM للعربية
      } else {
        res.status(200).json({
          success: true,
          recordCount: reportData.recordCount,
          generatedAt: reportData.generatedAt,
          data: reportData.data,
          message: `تم توليد تقرير يحتوي على ${reportData.recordCount} سجل بنجاح`
        });
      }

      logger.info("✅ Archive report generated successfully", {
        recordCount: reportData.recordCount,
        format,
        requestedBy
      });

    } catch (error) {
      logger.error("❌ Archive report generation failed", { error });
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * نقطة نهاية للبحث المتقدم في الأرشيف
 */
export const advancedArchiveSearch = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const searchParams = req.body;

      logger.info("🔍 Advanced archive search requested", { searchParams });

      const { advancedArchiveSearch: performSearch } = 
       await import('./modules/archiveReportsGenerator.js');

      const results = await performSearch(searchParams);

      res.status(200).json({
        success: true,
        recordCount: results.length,
        data: results,
        searchParams,
        generatedAt: new Date().toISOString()
      });

      logger.info("✅ Advanced archive search completed", {
        recordCount: results.length
      });

    } catch (error) {
      logger.error("❌ Advanced archive search failed", { error });
      res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
 *                    UTILITY EXPORTS
 * ═══════════════════════════════════════════════════════════════ */

// تصدير الوحدات للاختبار والاستخدام المباشر
export { generateWeeklyTasks, archiveTasks, deletePlanTasks, updateDashboardStats };