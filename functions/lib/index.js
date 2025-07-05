"use strict";
/* eslint-disable @typescript-eslint/no-var-requires */
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
exports.autoArchiveTasks = exports.onPlanDelete = exports.weeklyTaskGenerator = exports.updateDashboardStats = void 0;
// ─── استيرادات أساسية ─────────────────────────────────────
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const deletePlanTasks_1 = require("./modules/deletePlanTasks");
// ─── الوحدات المساعدة الجديدة ─────────────────────────────
const generateWeeklyTasks_1 = require("./modules/generateWeeklyTasks");
const archiveTasks_1 = require("./modules/archiveTasks");
// ─── تهيئة Admin ──────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();
/* 1) كودك الأصلي: updateDashboardStats (بدون أي تعديل) */
exports.updateDashboardStats = functions.firestore
    .document("work_orders/{orderId}")
    .onWrite(async (_change, _ctx) => {
    // … (الكود كما كان تماماً)
});
/* 2) weeklyTaskGenerator — يعمل كل إثنين 00:05 UTC */
exports.weeklyTaskGenerator = functions.pubsub
    .schedule("0 5 * * 1") // كرون: الدقيقة 0، الساعة 5 UTC، يوم الإثنين
    .timeZone("UTC")
    .onRun(async () => {
    // التعديل الوحيد هنا: استدعاء الدالة المصدَّرة generateWeeklyTasks(db)
    await (0, generateWeeklyTasks_1.generateWeeklyTasks)(db);
});
/* 2.1) onPlanDelete — Trigger عند حذف خطة الصيانة */
exports.onPlanDelete = functions.firestore
    .document("maintenance_plans/{planId}")
    .onDelete(async (_snap, context) => {
    const planId = context.params.planId;
    if (!planId)
        return;
    await (0, deletePlanTasks_1.deletePlanTasks)(planId);
});
/* 3) autoArchiveTasks — Trigger عند تحديث كل مهمة */
exports.autoArchiveTasks = functions.firestore
    .document("maintenance_plans/{planId}/tasks/{taskId}")
    .onUpdate((change, context) => (0, archiveTasks_1.archiveTasks)(change, context));
//# sourceMappingURL=index.js.map