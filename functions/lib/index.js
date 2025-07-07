"use strict";
// functions/src/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDashboardStats = exports.deletePlanTasks = exports.archiveTasks = exports.generateWeeklyTasks = exports.advancedArchiveSearch = exports.generateArchiveReport = exports.manualTaskGeneration = exports.planDeletionHandler = exports.taskAutoArchiver = exports.dashboardStatsUpdater = exports.dataCleanupScheduler = exports.weeklyTaskGenerator = void 0;
// ─── استيرادات Firebase Functions v2 (المحسّنة) ─────────────────
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
// ─── استيرادات Firebase Admin ─────────────────────────────
const admin = __importStar(require("firebase-admin"));
// ─── الوحدات المساعدة ─────────────────────────────────────
const generateWeeklyTasks_1 = require("./modules/generateWeeklyTasks");
Object.defineProperty(exports, "generateWeeklyTasks", { enumerable: true, get: function () { return generateWeeklyTasks_1.generateWeeklyTasks; } });
const archiveTasks_1 = require("./modules/archiveTasks");
Object.defineProperty(exports, "archiveTasks", { enumerable: true, get: function () { return archiveTasks_1.archiveTasks; } });
const deletePlanTasks_1 = require("./modules/deletePlanTasks");
Object.defineProperty(exports, "deletePlanTasks", { enumerable: true, get: function () { return deletePlanTasks_1.deletePlanTasks; } });
const updateDashboardStats_1 = require("./modules/updateDashboardStats");
Object.defineProperty(exports, "updateDashboardStats", { enumerable: true, get: function () { return updateDashboardStats_1.updateDashboardStats; } });
// ─── تهيئة Firebase Admin ──────────────────────────────────
admin.initializeApp();
/* ═══════════════════════════════════════════════════════════════
 *                    SCHEDULED FUNCTIONS
 * ═══════════════════════════════════════════════════════════════ */
/**
 * يولّد مهام الصيانة الوقائية كل إثنين في تمام الساعة 00:05 UTC
 * يعمل على إنشاء مهام جديدة للأسبوع القادم بناءً على خطط الصيانة النشطة
 */
exports.weeklyTaskGenerator = (0, scheduler_1.onSchedule)({
    schedule: "5 0 * * 1", // كل إثنين في 00:05 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 دقائق للعمليات الكبيرة
}, async (event) => {
    try {
        logger.info("🚀 Starting weekly task generation...", {
            eventId: event.scheduleTime,
            timestamp: new Date().toISOString()
        });
        await (0, generateWeeklyTasks_1.generateWeeklyTasks)();
        logger.info("✅ Weekly task generation completed successfully");
    }
    catch (error) {
        logger.error("❌ Failed to generate weekly tasks", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error; // إعادة رمي الخطأ لتتبع الفشل في Cloud Console
    }
});
/**
 * ينظف البيانات القديمة والمهام المؤرشفة كل يوم أحد في 02:00 UTC
 * يحذف المهام المكتملة التي مضى عليها أكثر من 90 يوماً
 */
exports.dataCleanupScheduler = (0, scheduler_1.onSchedule)({
    schedule: "0 2 * * 0", // كل أحد في 02:00 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 300,
}, async (event) => {
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
    }
    catch (error) {
        logger.error("❌ Failed to perform data cleanup", { error });
        throw error;
    }
});
/* ═══════════════════════════════════════════════════════════════
 *                    FIRESTORE TRIGGERS
 * ═══════════════════════════════════════════════════════════════ */
/**
 * يُحدّث إحصائيات لوحة التحكم عند تغيير حالة طلبات العمل
 */
exports.dashboardStatsUpdater = (0, firestore_1.onDocumentUpdated)({
    document: "work_orders/{orderId}",
    region: "us-central1",
    memory: "256MiB",
}, async (event) => {
    var _a, _b;
    try {
        logger.info("📊 Updating dashboard stats...", {
            orderId: (_a = event.params) === null || _a === void 0 ? void 0 : _a.orderId
        });
        await (0, updateDashboardStats_1.updateDashboardStats)(event);
        logger.info("✅ Dashboard stats updated successfully");
    }
    catch (error) {
        logger.error("❌ Failed to update dashboard stats", {
            error,
            orderId: (_b = event.params) === null || _b === void 0 ? void 0 : _b.orderId
        });
        // لا نرمي الخطأ هنا لأن فشل تحديث الإحصائيات لا يجب أن يؤثر على العملية الأصلية
    }
});
/**
 * يؤرشف المهام المكتملة تلقائياً بعد فترة محددة
 */
exports.taskAutoArchiver = (0, firestore_1.onDocumentUpdated)({
    document: "maintenance_tasks/{taskId}",
    region: "us-central1",
    memory: "256MiB",
}, async (event) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const before = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before) === null || _b === void 0 ? void 0 : _b.data();
        const after = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after) === null || _d === void 0 ? void 0 : _d.data();
        // تحقق من تغيير الحالة إلى مكتمل
        if ((before === null || before === void 0 ? void 0 : before.status) !== 'Completed' && (after === null || after === void 0 ? void 0 : after.status) === 'Completed') {
            logger.info("📋 Task completed, starting archiving process...", {
                taskId: (_e = event.params) === null || _e === void 0 ? void 0 : _e.taskId
            });
            // ⭐ إصلاح: تمرير event فقط (متوافق مع v2)
            await (0, archiveTasks_1.archiveTasks)(event);
            logger.info("✅ Task archiving completed successfully");
        }
    }
    catch (error) {
        logger.error("❌ Failed to archive task", {
            error,
            taskId: (_f = event.params) === null || _f === void 0 ? void 0 : _f.taskId
        });
    }
});
/**
 * ينظف المهام المرتبطة عند حذف خطة صيانة
 */
exports.planDeletionHandler = (0, firestore_1.onDocumentDeleted)({
    document: "maintenance_plans/{planId}",
    region: "us-central1",
    memory: "256MiB",
}, async (event) => {
    var _a, _b;
    try {
        const planId = (_a = event.params) === null || _a === void 0 ? void 0 : _a.planId;
        if (!planId) {
            logger.warn("⚠️ Plan deletion event without planId");
            return;
        }
        logger.info("🗑️ Maintenance plan deleted, cleaning up tasks...", { planId });
        await (0, deletePlanTasks_1.deletePlanTasks)(planId);
        logger.info("✅ Plan cleanup completed successfully", { planId });
    }
    catch (error) {
        logger.error("❌ Failed to cleanup deleted plan", {
            error,
            planId: (_b = event.params) === null || _b === void 0 ? void 0 : _b.planId
        });
        throw error;
    }
});
/* ═══════════════════════════════════════════════════════════════
 *                    HTTP FUNCTIONS
 * ═══════════════════════════════════════════════════════════════ */
/**
 * نقطة نهاية لتشغيل توليد المهام يدوياً (للاختبار والطوارئ)
 */
exports.manualTaskGeneration = (0, https_1.onRequest)({
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async (req, res) => {
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
        await (0, generateWeeklyTasks_1.generateWeeklyTasks)();
        res.status(200).json({
            success: true,
            message: 'Tasks generated successfully',
            timestamp: new Date().toISOString()
        });
        logger.info("✅ Manual task generation completed");
    }
    catch (error) {
        logger.error("❌ Manual task generation failed", { error });
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * نقطة نهاية لتوليد تقارير الأرشيف (للبيانات التاريخية)
 */
exports.generateArchiveReport = (0, https_1.onRequest)({
    region: "us-central1",
    memory: "1GiB", // ذاكرة أكبر للتعامل مع كميات كبيرة من البيانات
    timeoutSeconds: 540, // 9 دقائق للتقارير الكبيرة
}, async (req, res) => {
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
        const { reportType = 'maintenance', dateFrom, dateTo, status = 'all', includeFinancials = true, format = 'json', requestedBy = 'unknown' } = req.body;
        logger.info("📊 Archive report generation requested", {
            reportType,
            dateRange: `${dateFrom} to ${dateTo}`,
            requestedBy,
            userAgent: req.headers['user-agent']
        });
        // استيراد الوحدة محلياً لتجنب مشاكل التبعيات
        const { generateArchiveReport: generateReport, convertToCSV } = await import('./modules/archiveReportsGenerator.js');
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
            res.setHeader('Content-Disposition', `attachment; filename="archive_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv"`);
            res.status(200).send('\uFEFF' + csvContent); // BOM للعربية
        }
        else {
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
    }
    catch (error) {
        logger.error("❌ Archive report generation failed", { error });
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * نقطة نهاية للبحث المتقدم في الأرشيف
 */
exports.advancedArchiveSearch = (0, https_1.onRequest)({
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async (req, res) => {
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
        const { advancedArchiveSearch: performSearch } = await import('./modules/archiveReportsGenerator.js');
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
    }
    catch (error) {
        logger.error("❌ Advanced archive search failed", { error });
        res.status(500).json({
            error: 'Search failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=index.js.map