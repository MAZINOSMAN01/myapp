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
exports.generateWeeklyTasks = generateWeeklyTasks;
const admin = __importStar(require("firebase-admin"));
/**
 * دالة مساعدة لتوليد مهام الصيانة المستقبلية لكل خطة.
 * يمكن استدعاؤها من أي Cloud Function (مثلاً: جدولة أو Trigger).
 * @param db مرجع قاعدة بيانات Firestore (مثلاً: admin.firestore())
 */
async function generateWeeklyTasks(db) {
    const now = admin.firestore.Timestamp.now();
    const oneYear = now.toDate();
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    const plansSnap = await db.collection("maintenance_plans").get();
    const batch = db.batch();
    let created = 0;
    plansSnap.forEach((planDoc) => {
        const plan = planDoc.data();
        // التحقق من وجود startDate و frequency
        if (!plan.startDate || !plan.frequency) {
            console.log(`[generateWeeklyTasks] الخطة ${planDoc.id} ناقصة البيانات`);
            return;
        }
        // احسب أول تاريخ إدراج ≥ اليوم
        let due = plan.startDate.toDate();
        while (due < now.toDate()) {
            due = nextDate(due, plan.frequency);
        }
        // أنشئ مهام حتى سنة للأمام
        while (due <= oneYear) {
            (plan.tasks || []).forEach((desc) => {
                const ref = db.collection("maintenance_tasks").doc();
                batch.set(ref, {
                    planId: planDoc.id,
                    assetId: plan.assetId,
                    taskDescription: desc,
                    dueDate: admin.firestore.Timestamp.fromDate(due),
                    status: "Pending",
                    type: "Preventive",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                created++;
            });
            due = nextDate(due, plan.frequency);
        }
    });
    await batch.commit();
    console.log(`[generateWeeklyTasks] تم إنشاء ${created} مهمة`);
}
/**
 * دالة مساعدة لحساب التاريخ التالي بناءً على تكرار الخطة.
 */
function nextDate(d, freq) {
    const n = new Date(d);
    switch (freq) {
        case "Daily":
            n.setDate(n.getDate() + 1);
            break;
        case "Weekly":
            n.setDate(n.getDate() + 7);
            break;
        case "Monthly":
            n.setMonth(n.getMonth() + 1);
            break;
        case "Quarterly":
            n.setMonth(n.getMonth() + 3);
            break;
        case "Semi-annually":
            n.setMonth(n.getMonth() + 6);
            break;
        case "Annually":
            n.setFullYear(n.getFullYear() + 1);
            break;
        default: break;
    }
    return n;
}
//# sourceMappingURL=generateWeeklyTasks.js.map