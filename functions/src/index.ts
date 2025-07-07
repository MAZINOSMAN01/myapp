/* eslint-disable @typescript-eslint/no-var-requires */

// ─── استيرادات أساسية ─────────────────────────────────────
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { deletePlanTasks } from "./modules/deletePlanTasks";

// ─── الوحدات المساعدة الجديدة ─────────────────────────────
import { generateWeeklyTasks } from "./modules/generateWeeklyTasks";
import { archiveTasks } from "./modules/archiveTasks";

// ─── تهيئة Admin ──────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();

/* 1) كودك الأصلي: updateDashboardStats (بدون أي تعديل) */
export const updateDashboardStats = functions.firestore
  .document("work_orders/{orderId}")
  .onWrite(async (change, context) => {
    try {
      // Add your dashboard stats logic here
      console.log(`Dashboard stats updated for order: ${context.params.orderId}`);
      
      // Example stats calculation
      const workOrdersSnapshot = await db.collection('work_orders').get();
      const totalOrders = workOrdersSnapshot.size;
      
      const pendingOrders = workOrdersSnapshot.docs.filter(
        doc => doc.data().status === 'pending'
      ).length;
      
      const completedOrders = workOrdersSnapshot.docs.filter(
        doc => doc.data().status === 'completed'
      ).length;
      
      // Update dashboard stats document
      await db.collection('dashboard_stats').doc('summary').set({
        totalOrders,
        pendingOrders,
        completedOrders,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error updating dashboard stats:', error);
    }
  });

/* 2) weeklyTaskGenerator — يعمل كل إثنين 00:05 UTC */
export const weeklyTaskGenerator = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes - allow more time for bulk operations
    memory: '512MB'
  })
  .pubsub
  .schedule("5 0 * * 1")   // كرون: الدقيقة 5، الساعة 0 UTC، يوم الإثنين
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      console.log('Starting weekly task generation...');
      await generateWeeklyTasks(db);
      console.log('Weekly task generation completed successfully');
    } catch (error) {
      console.error('Error in weekly task generation:', error);
      throw error; // Re-throw to mark function as failed
    }
  });

/* 2.1) onPlanDelete — Trigger عند حذف خطة الصيانة */
export const onPlanDelete = functions.firestore
  .document("maintenance_plans/{planId}")
  .onDelete(async (snap, context) => {
    try {
      const planId = context.params.planId;
      const planData = snap.data();
      
      console.log(`Plan deleted: ${planId}, cleaning up associated tasks...`);
      
      if (!planId) {
        console.warn('No planId found in context');
        return;
      }
      
      await deletePlanTasks(planId);
      
      console.log(`Successfully cleaned up tasks for plan: ${planId}`);
      
      // Log the deletion for audit purposes
      await db.collection('audit_logs').add({
        action: 'plan_deleted',
        planId,
        planName: planData?.planName || 'Unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Plan "${planData?.planName || planId}" and its associated tasks were deleted`
      });
      
    } catch (error) {
      console.error(`Error deleting tasks for plan ${context.params.planId}:`, error);
      // Don't throw here to avoid infinite retries
    }
  });

/* 3) autoArchiveTasks — Trigger عند تحديث كل مهمة */
export const autoArchiveTasks = functions.firestore
  .document("maintenance_tasks/{taskId}") // Fixed path - tasks are in root collection
  .onUpdate(async (change, context) => {
    try {
      await archiveTasks(change, context);
    } catch (error) {
      console.error(`Error archiving task ${context.params.taskId}:`, error);
      // Don't throw to avoid infinite retries
    }
  });

/* 4) دالة إضافية: تنظيف المهام المكتملة القديمة */
export const cleanupOldTasks = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  .pubsub
  .schedule("0 2 1 * *") // First day of every month at 2 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      console.log('Starting cleanup of old completed tasks...');
      
      // Delete completed tasks older than 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const oldTasksQuery = db.collection('maintenance_tasks')
        .where('status', '==', 'completed')
        .where('completedAt', '<', admin.firestore.Timestamp.fromDate(sixMonthsAgo));
      
      const oldTasksSnapshot = await oldTasksQuery.get();
      
      if (oldTasksSnapshot.empty) {
        console.log('No old completed tasks to clean up');
        return;
      }
      
      // Delete in batches
      const batch = db.batch();
      let count = 0;
      
      oldTasksSnapshot.docs.forEach(doc => {
        if (count < 500) { // Firestore batch limit
          batch.delete(doc.ref);
          count++;
        }
      });
      
      await batch.commit();
      
      console.log(`Cleaned up ${count} old completed tasks`);
      
      // Log the cleanup
      await db.collection('audit_logs').add({
        action: 'cleanup_old_tasks',
        tasksDeleted: count,
        cutoffDate: sixMonthsAgo,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error in cleanup of old tasks:', error);
      throw error;
    }
  });

/* 5) دالة إضافية: إرسال تذكيرات للمهام المتأخرة */
export const sendOverdueTaskReminders = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB'
  })
  .pubsub
  .schedule("0 8 * * *") // Every day at 8 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      console.log('Checking for overdue tasks...');
      
      const now = admin.firestore.Timestamp.now();
      const overdueTasksQuery = db.collection('maintenance_tasks')
        .where('status', '==', 'pending')
        .where('dueDate', '<', now);
      
      const overdueTasksSnapshot = await overdueTasksQuery.get();
      
      if (overdueTasksSnapshot.empty) {
        console.log('No overdue tasks found');
        return;
      }
      
      console.log(`Found ${overdueTasksSnapshot.size} overdue tasks`);
      
      // Group overdue tasks by assigned user
      const tasksByUser: { [userId: string]: any[] } = {};
      
      overdueTasksSnapshot.docs.forEach(doc => {
        const task = doc.data();
        const assignedTo = task.assignedTo;
        
        if (assignedTo) {
          if (!tasksByUser[assignedTo]) {
            tasksByUser[assignedTo] = [];
          }
          tasksByUser[assignedTo].push({
            id: doc.id,
            ...task
          });
        }
      });
      
      // Create notifications for each user
      const batch = db.batch();
      
      Object.entries(tasksByUser).forEach(([userId, tasks]) => {
        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
          userId,
          type: 'overdue_tasks',
          title: 'Overdue Maintenance Tasks',
          message: `You have ${tasks.length} overdue maintenance task(s)`,
          taskCount: tasks.length,
          tasks: tasks.map(t => ({
            id: t.id,
            description: t.taskDescription,
            dueDate: t.dueDate
          })),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      });
      
      await batch.commit();
      
      console.log(`Created notifications for ${Object.keys(tasksByUser).length} users`);
      
    } catch (error) {
      console.error('Error sending overdue task reminders:', error);
      throw error;
    }
  });