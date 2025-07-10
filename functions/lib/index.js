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
exports.updateDashboardStats = exports.deletePlanTasks = exports.archiveTasks = exports.generateWeeklyTasks = exports.getSystemStats = exports.manualTaskGeneration = exports.planDeletionHandler = exports.taskAutoArchiver = exports.dashboardStatsUpdater = exports.dataCleanupScheduler = exports.weeklyTaskGenerator = void 0;
// ─── استيرادات Firebase Functions v2 ─────────────────
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
// ─── استيرادات Firebase Admin ─────────────────────────────
const admin = __importStar(require("firebase-admin"));
// ─── الوحدات المساعدة ─────────────────────────────────────
const generateWeeklyTasks_1 = require("./modules/generateWeeklyTasks");
const archiveTasks_1 = require("./modules/archiveTasks");
const deletePlanTasks_1 = require("./modules/deletePlanTasks");
const updateDashboardStats_1 = require("./modules/updateDashboardStats");
// ─── تهيئة Firebase Admin ──────────────────────────────────
admin.initializeApp();
/* ═══════════════════════════════════════════════════════════════
 *                    SCHEDULED FUNCTIONS
 * ═══════════════════════════════════════════════════════════════ */
/**
 * يولّد مهام الصيانة الوقائية كل إثنين في تمام الساعة 00:05 UTC
 */
exports.weeklyTaskGenerator = (0, scheduler_1.onSchedule)({
    schedule: "5 0 * * 1", // كل إثنين في 00:05 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540,
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
        throw error;
    }
});
/**
 * ينظف المهام المنتهية الصلاحية كل يوم في الساعة 02:00 UTC
 */
exports.dataCleanupScheduler = (0, scheduler_1.onSchedule)({
    schedule: "0 2 * * *", // كل يوم في 02:00 UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 300,
}, async () => {
    try {
        logger.info("🧹 Starting data cleanup...");
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();
        const cutoffDate = admin.firestore.Timestamp.fromDate(new Date(now.toDate().getTime() - (14 * 24 * 60 * 60 * 1000)) // 14 يوم مضى
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
    }
    catch (error) {
        logger.error("❌ Failed to cleanup data", { error });
    }
});
/* ═══════════════════════════════════════════════════════════════
 *                    FIRESTORE TRIGGERS
 * ═══════════════════════════════════════════════════════════════ */
/**
 * يحدث إحصائيات لوحة التحكم عند تغيير أوامر العمل
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
    }
});
/**
 * يؤرشف المهام المكتملة تلقائياً
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
 * نقطة نهاية لتشغيل توليد المهام يدوياً
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
            message: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * نقطة نهاية للحصول على إحصائيات النظام
 */
exports.getSystemStats = (0, https_1.onRequest)({
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
}, async (req, res) => {
    try {
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const db = admin.firestore();
        // إحصائيات المهام
        const tasksSnapshot = await db.collection("maintenance_tasks").get();
        const completedTasks = tasksSnapshot.docs.filter(doc => doc.data().status === 'Completed').length;
        // إحصائيات خطط الصيانة
        const plansSnapshot = await db.collection("maintenance_plans").get();
        const activePlans = plansSnapshot.docs.filter(doc => doc.data().isActive !== false).length;
        // إحصائيات أوامر العمل
        const workOrdersSnapshot = await db.collection("work_orders").get();
        const openWorkOrders = workOrdersSnapshot.docs.filter(doc => ['Open', 'Pending', 'In Progress'].includes(doc.data().status)).length;
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
    }
    catch (error) {
        logger.error("❌ Failed to get system stats", { error });
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});
// إعادة تصدير الوحدات للاستخدام الخارجي
var generateWeeklyTasks_2 = require("./modules/generateWeeklyTasks");
Object.defineProperty(exports, "generateWeeklyTasks", { enumerable: true, get: function () { return generateWeeklyTasks_2.generateWeeklyTasks; } });
var archiveTasks_2 = require("./modules/archiveTasks");
Object.defineProperty(exports, "archiveTasks", { enumerable: true, get: function () { return archiveTasks_2.archiveTasks; } });
var deletePlanTasks_2 = require("./modules/deletePlanTasks");
Object.defineProperty(exports, "deletePlanTasks", { enumerable: true, get: function () { return deletePlanTasks_2.deletePlanTasks; } });
var updateDashboardStats_2 = require("./modules/updateDashboardStats");
Object.defineProperty(exports, "updateDashboardStats", { enumerable: true, get: function () { return updateDashboardStats_2.updateDashboardStats; } });
//# sourceMappingURL=index.js.map