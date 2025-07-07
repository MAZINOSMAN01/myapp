"use strict";
// functions/src/modules/updateDashboardStats.ts
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
exports.updateDashboardStats = updateDashboardStats;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
/**
 * تحديث إحصائيات لوحة التحكم بناءً على تغييرات طلبات العمل
 */
async function updateDashboardStats(event) {
    const db = admin.firestore();
    try {
        // جلب جميع طلبات العمل
        const workOrdersSnapshot = await db.collection("work_orders").get();
        const now = new Date();
        // تهيئة العدادات
        let openOrders = 0;
        let completedOrders = 0;
        let inProgressOrders = 0;
        let overdueOrders = 0;
        let scheduledOrders = 0;
        let pendingOrders = 0;
        // حساب الإحصائيات
        workOrdersSnapshot.forEach((doc) => {
            var _a;
            const order = doc.data();
            const status = (_a = order.status) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            switch (status) {
                case 'completed':
                    completedOrders++;
                    break;
                case 'in progress':
                case 'in_progress':
                    inProgressOrders++;
                    openOrders++;
                    break;
                case 'scheduled':
                    scheduledOrders++;
                    openOrders++;
                    break;
                case 'pending':
                    pendingOrders++;
                    openOrders++;
                    break;
                case 'open':
                    openOrders++;
                    break;
            }
            // حساب المهام المتأخرة
            if (order.dueDate && status !== 'completed') {
                let dueDate;
                if (order.dueDate.toDate) {
                    // Firestore Timestamp
                    dueDate = order.dueDate.toDate();
                }
                else if (typeof order.dueDate === 'string') {
                    dueDate = new Date(order.dueDate);
                }
                else {
                    dueDate = new Date(order.dueDate);
                }
                if (dueDate < now) {
                    overdueOrders++;
                }
            }
        });
        // جلب إحصائيات إضافية
        const [usersSnapshot, tasksSnapshot] = await Promise.all([
            db.collection("users").count().get(),
            db.collection("maintenance_tasks").count().get()
        ]);
        // إنشاء كائن الإحصائيات
        const stats = {
            // طلبات العمل
            totalWorkOrders: workOrdersSnapshot.size,
            openOrders,
            completedOrders,
            inProgressOrders,
            overdueOrders,
            scheduledOrders,
            pendingOrders,
            // إحصائيات عامة
            totalUsers: usersSnapshot.data().count,
            totalTasks: tasksSnapshot.data().count,
            // معلومات التحديث
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            lastCalculated: admin.firestore.Timestamp.now(),
            // نسب مئوية
            completionRate: workOrdersSnapshot.size > 0 ?
                Math.round((completedOrders / workOrdersSnapshot.size) * 100) : 0,
            overdueRate: openOrders > 0 ?
                Math.round((overdueOrders / openOrders) * 100) : 0,
        };
        // حفظ الإحصائيات
        await db.collection("dashboard_stats").doc("summary").set(stats, { merge: true });
        logger.info("📊 Dashboard stats updated successfully", {
            totalWorkOrders: stats.totalWorkOrders,
            completedOrders: stats.completedOrders,
            overdueOrders: stats.overdueOrders,
            completionRate: stats.completionRate
        });
    }
    catch (error) {
        logger.error("❌ Error updating dashboard stats", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}
//# sourceMappingURL=updateDashboardStats.js.map