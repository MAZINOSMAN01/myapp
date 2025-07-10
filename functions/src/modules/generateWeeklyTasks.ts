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

interface MaintenanceTask {
  planId: string;
  assetId: string;
  taskDescription: string;
  dueDate: admin.firestore.Timestamp;
  status: string;
  priority: string;
  assignedTo?: string;
  createdAt: admin.firestore.Timestamp;
  planName: string;
  frequency: string;
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
            const newTask: MaintenanceTask = {
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
        
      } catch (planError) {
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
    } else {
      logger.info("ℹ️ No new tasks needed for next week");
    }
    
  } catch (error) {
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
function getFrequencyInDays(frequency: string): number {
  const frequencyMap: Record<string, number> = {
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
function getPriorityBasedOnFrequency(frequency: string): string {
  const priorityMap: Record<string, string> = {
    'Daily': 'High',
    'Weekly': 'High',
    'Monthly': 'Medium',
    'Quarterly': 'Medium',
    'Semi-annually': 'Low',
    'Annually': 'Low'
  };
  
  return priorityMap[frequency] || 'Medium';
}