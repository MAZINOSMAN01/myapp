"use strict";
// functions/src/modules/generateWeeklyTasks.ts
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
const logger = __importStar(require("firebase-functions/logger"));
/**
 * توليد مهام الصيانة الوقائية للأسبوع القادم
 */
async function generateWeeklyTasks() {
    const db = admin.firestore();
    try {
        logger.info("🚀 Starting weekly task generation process...");
        // جلب خطط الصيانة النشطة
        const plansSnapshot = await db.collection("maintenance_plans")
            .where("isActive", "!=", false) // تضمين الخطط التي لا تحتوي على isActive أو true
            .get();
        if (plansSnapshot.empty) {
            logger.info("ℹ️ No active maintenance plans found");
            return;
        }
        logger.info(`📋 Found ${plansSnapshot.size} active maintenance plans`);
        const batch = db.batch();
        let totalTasksGenerated = 0;
        const now = new Date();
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(now.getDate() + 7);
        nextWeekStart.setHours(0, 0, 0, 0);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 7);
        for (const planDoc of plansSnapshot.docs) {
            const plan = { id: planDoc.id, ...planDoc.data() };
            try {
                // التحقق من صحة بيانات الخطة
                if (!plan.tasks || plan.tasks.length === 0) {
                    logger.warn(`⚠️ Plan ${plan.id} has no tasks, skipping...`);
                    continue;
                }
                if (!plan.frequency) {
                    logger.warn(`⚠️ Plan ${plan.id} has no frequency, skipping...`);
                    continue;
                }
                // حساب التواريخ المطلوبة للأسبوع القادم
                const dueDates = calculateDueDatesForPlan(plan, nextWeekStart, nextWeekEnd);
                if (dueDates.length === 0) {
                    continue; // لا توجد مهام مطلوبة هذا الأسبوع
                }
                // توليد المهام لكل تاريخ استحقاق
                for (const dueDate of dueDates) {
                    for (const taskDescription of plan.tasks) {
                        // التحقق من عدم وجود مهمة مماثلة
                        const existingTaskQuery = await db.collection("maintenance_tasks")
                            .where("planId", "==", plan.id)
                            .where("taskDescription", "==", taskDescription)
                            .where("dueDate", "==", admin.firestore.Timestamp.fromDate(dueDate))
                            .limit(1)
                            .get();
                        if (!existingTaskQuery.empty) {
                            continue; // المهمة موجودة بالفعل
                        }
                        // إنشاء مهمة جديدة
                        const newTask = {
                            planId: plan.id,
                            assetId: plan.assetId,
                            taskDescription,
                            dueDate: admin.firestore.Timestamp.fromDate(dueDate),
                            status: "Pending",
                            priority: getPriorityBasedOnFrequency(plan.frequency),
                            assignedTo: plan.assignedTo || "",
                            createdAt: admin.firestore.Timestamp.now(),
                            planName: plan.planName,
                            frequency: plan.frequency
                        };
                        const taskRef = db.collection("maintenance_tasks").doc();
                        batch.set(taskRef, newTask);
                        totalTasksGenerated++;
                    }
                }
                // تحديث lastGenerated للخطة
                const planRef = db.collection("maintenance_plans").doc(plan.id);
                batch.update(planRef, {
                    lastGenerated: admin.firestore.Timestamp.now()
                });
            }
            catch (planError) {
                logger.error(`❌ Error processing plan ${plan.id}`, {
                    error: planError instanceof Error ? planError.message : String(planError),
                    planId: plan.id
                });
            }
        }
        // تنفيذ جميع العمليات
        if (totalTasksGenerated > 0) {
            await batch.commit();
            logger.info(`✅ Successfully generated ${totalTasksGenerated} new tasks`);
        }
        else {
            logger.info("ℹ️ No new tasks needed for next week");
        }
    }
    catch (error) {
        logger.error("❌ Failed to generate weekly tasks", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}
/**
 * حساب التواريخ المطلوبة لخطة محددة خلال فترة زمنية
 */
function calculateDueDatesForPlan(plan, startDate, endDate) {
    const dueDates = [];
    if (!plan.firstDueDate) {
        return dueDates;
    }
    const firstDue = plan.firstDueDate.toDate();
    const frequencyInDays = getFrequencyInDays(plan.frequency);
    if (frequencyInDays === 0) {
        return dueDates;
    }
    // البحث عن التواريخ المطلوبة في النطاق المحدد
    let currentDate = new Date(firstDue);
    // التأكد من البدء من تاريخ مناسب
    while (currentDate < startDate) {
        currentDate.setDate(currentDate.getDate() + frequencyInDays);
    }
    // إضافة التواريخ المطلوبة
    while (currentDate < endDate) {
        dueDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + frequencyInDays);
    }
    return dueDates;
}
/**
 * تحويل تكرار الصيانة إلى عدد أيام
 */
function getFrequencyInDays(frequency) {
    const frequencyMap = {
        'Daily': 1,
        'Weekly': 7,
        'Monthly': 30,
        'Quarterly': 90,
        'Semi-annually': 180,
        'Annually': 365
    };
    return frequencyMap[frequency] || 0;
}
/**
 * تحديد الأولوية بناءً على تكرار الصيانة
 */
function getPriorityBasedOnFrequency(frequency) {
    const priorityMap = {
        'Daily': 'High',
        'Weekly': 'High',
        'Monthly': 'Medium',
        'Quarterly': 'Medium',
        'Semi-annually': 'Low',
        'Annually': 'Low'
    };
    return priorityMap[frequency] || 'Medium';
}
//# sourceMappingURL=generateWeeklyTasks.js.map