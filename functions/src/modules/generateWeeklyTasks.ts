// functions/src/modules/generateWeeklyTasks.ts

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

interface MaintenancePlan {
  id: string;
  assetId: string;
  planName: string;
  tasks: string[];
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-annually' | 'Annually';
  firstDueDate: admin.firestore.Timestamp;
  assignedTo?: string;
  isActive?: boolean;
  lastGenerated?: admin.firestore.Timestamp;
}

/**
 * توليد مهام الصيانة الوقائية للأسبوع القادم
 */
export async function generateWeeklyTasks(): Promise<void> {
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
      const plan = { id: planDoc.id, ...planDoc.data() } as MaintenancePlan;
      
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
            const taskRef = db.collection("maintenance_tasks").doc();
            const taskData = {
              planId: plan.id,
              assetId: plan.assetId,
              taskDescription,
              type: "Preventive",
              status: "Pending",
              dueDate: admin.firestore.Timestamp.fromDate(dueDate),
              assignedTo: plan.assignedTo || null,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: "system_scheduler",
              priority: "Medium",
              estimatedDuration: null,
              actualDuration: null,
              cost: null,
              notes: "",
              completedAt: null,
              completedBy: null
            };
            
            batch.set(taskRef, taskData);
            totalTasksGenerated++;
          }
        }
        
        // تحديث تاريخ آخر توليد للخطة
        batch.update(planDoc.ref, {
          lastGenerated: admin.firestore.FieldValue.serverTimestamp()
        });
        
      } catch (planError) {
        logger.error(`❌ Error processing plan ${plan.id}`, {
          error: planError instanceof Error ? planError.message : String(planError),
          planId: plan.id
        });
        // الاستمرار مع الخطط الأخرى
      }
    }
    
    // تنفيذ العمليات
    if (totalTasksGenerated > 0) {
      await batch.commit();
      logger.info(`✅ Successfully generated ${totalTasksGenerated} tasks for next week`);
      
      // تحديث إحصائيات التوليد
      await db.collection("system_stats").doc("task_generation").set({
        lastRun: admin.firestore.FieldValue.serverTimestamp(),
        tasksGenerated: totalTasksGenerated,
        plansProcessed: plansSnapshot.size,
        weekStart: admin.firestore.Timestamp.fromDate(nextWeekStart),
        weekEnd: admin.firestore.Timestamp.fromDate(nextWeekEnd)
      }, { merge: true });
      
    } else {
      logger.info("ℹ️ No new tasks needed for next week");
    }
    
  } catch (error) {
    logger.error("❌ Fatal error in weekly task generation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * حساب تواريخ الاستحقاق للخطة في فترة معينة
 */
function calculateDueDatesForPlan(
  plan: MaintenancePlan, 
  startDate: Date, 
  endDate: Date
): Date[] {
  const dueDates: Date[] = [];
  
  if (!plan.firstDueDate) {
    return dueDates;
  }
  
  const firstDue = plan.firstDueDate.toDate();
  let currentDate = new Date(firstDue);
  
  // التأكد من أن التاريخ الحالي في المستقبل
  const now = new Date();
  while (currentDate <= now) {
    currentDate = getNextDueDate(currentDate, plan.frequency);
  }
  
  // جمع جميع التواريخ في الفترة المطلوبة
  while (currentDate < endDate) {
    if (currentDate >= startDate) {
      dueDates.push(new Date(currentDate));
    }
    currentDate = getNextDueDate(currentDate, plan.frequency);
  }
  
  return dueDates;
}

/**
 * حساب التاريخ التالي بناءً على التكرار
 */
function getNextDueDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'Daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'Weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'Monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'Quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'Semi-annually':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'Annually':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      logger.warn(`⚠️ Unknown frequency: ${frequency}, defaulting to weekly`);
      nextDate.setDate(nextDate.getDate() + 7);
  }
  
  return nextDate;
}