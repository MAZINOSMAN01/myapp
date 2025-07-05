"use strict";
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
exports.cleanupOrphanTasks = cleanupOrphanTasks;
const admin = __importStar(require("firebase-admin"));
/**
 * دالة تنظيف: حذف جميع المهام المرتبطة بخطط محذوفة (يتيمة)
 * استخدمها مرة واحدة فقط عند الحاجة ثم احذف الكود.
 */
async function cleanupOrphanTasks() {
    const db = admin.firestore();
    // جلب كل معرفات الخطط الحالية
    const plansSnap = await db.collection("maintenance_plans").get();
    const validPlanIds = new Set(plansSnap.docs.map(doc => doc.id));
    // جلب كل المهام
    const tasksSnap = await db.collection("maintenance_tasks").get();
    let deleted = 0;
    const batch = db.batch();
    tasksSnap.forEach((taskDoc) => {
        const data = taskDoc.data();
        // إذا كان planId غير موجود بين الخطط الحالية
        if (!validPlanIds.has(data.planId)) {
            batch.delete(taskDoc.ref);
            deleted++;
        }
    });
    await batch.commit();
    console.log(`[cleanupOrphanTasks] تم حذف ${deleted} مهمة يتيمة`);
}
//# sourceMappingURL=cleanupOrphanTasks.js.map