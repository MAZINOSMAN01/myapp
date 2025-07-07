"use strict";
// functions/src/modules/archiveTasks.ts
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
exports.archiveTasks = archiveTasks;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const ARCHIVE_AFTER_DAYS = 14;
/**
 * يؤرشف المهام المكتملة تلقائياً بعد فترة محددة
 * متوافق مع Firebase Functions v2
 */
async function archiveTasks(event) {
    var _a, _b, _c, _d;
    try {
        const taskId = (_a = event.params) === null || _a === void 0 ? void 0 : _a.taskId;
        if (!taskId) {
            logger.warn("⚠️ Archive task event without taskId");
            return;
        }
        // الحصول على بيانات المهمة بعد التحديث
        const taskData = (_c = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after) === null || _c === void 0 ? void 0 : _c.data();
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
        let completionDate;
        if (taskData.completedAt) {
            // استخدام تاريخ الاكتمال إذا كان متاحاً
            completionDate = taskData.completedAt.toDate ?
                taskData.completedAt.toDate() :
                new Date(taskData.completedAt);
        }
        else if (taskData.dueDate) {
            // استخدام تاريخ الاستحقاق كبديل
            completionDate = taskData.dueDate.toDate ?
                taskData.dueDate.toDate() :
                new Date(taskData.dueDate);
        }
        else {
            logger.warn(`⚠️ No completion or due date for task ${taskId}`);
            return;
        }
        const daysSinceCompletion = (Date.now() - completionDate.getTime()) / (1000 * 60 * 60 * 24);
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
        }
        else {
            const remainingDays = ARCHIVE_AFTER_DAYS - daysSinceCompletion;
            logger.info(`ℹ️ Task ${taskId} will be archived in ${Math.ceil(remainingDays)} days`);
        }
    }
    catch (error) {
        logger.error("❌ Error in archiveTasks function", {
            error: error instanceof Error ? error.message : String(error),
            taskId: (_d = event.params) === null || _d === void 0 ? void 0 : _d.taskId,
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}
/**
 * تحديث إحصائيات الأرشفة
 */
async function updateArchiveStats() {
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
        }
        else {
            // إنشاء مستند إحصائيات جديد
            await statsRef.set({
                daily: { [today]: 1 },
                totalArchived: 1,
                lastArchived: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    catch (error) {
        logger.error("❌ Error updating archive stats", { error });
        // لا نرمي الخطأ هنا لأن فشل تحديث الإحصائيات لا يجب أن يؤثر على الأرشفة
    }
}
//# sourceMappingURL=archiveTasks.js.map