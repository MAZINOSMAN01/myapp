import * as admin from "firebase-admin";

/**
 * دالة تنظيف: حذف جميع المهام المرتبطة بخطط محذوفة (يتيمة)
 * استخدمها مرة واحدة فقط عند الحاجة ثم احذف الكود.
 */
export async function cleanupOrphanTasks() {
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
