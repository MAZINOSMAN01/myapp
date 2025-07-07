// functions/src/modules/updateDashboardStats.ts

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * تحديث إحصائيات لوحة التحكم بناءً على تغييرات طلبات العمل
 */
export async function updateDashboardStats(event: any): Promise<void> {
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
      const order = doc.data();
      const status = order.status?.toLowerCase();
      
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
        let dueDate: Date;
        
        if (order.dueDate.toDate) {
          // Firestore Timestamp
          dueDate = order.dueDate.toDate();
        } else if (typeof order.dueDate === 'string') {
          dueDate = new Date(order.dueDate);
        } else {
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
    
  } catch (error) {
    logger.error("❌ Error updating dashboard stats", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}