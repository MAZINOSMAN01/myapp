import * as admin from "firebase-admin";

/**
 * حذف جميع المهام المرتبطة بخطة صيانة محددة
 * @param planId معرّف خطة الصيانة
 */
export async function deletePlanTasks(planId: string) {
  const db = admin.firestore();
  const tasksSnap = await db
    .collection("maintenance_tasks")
    .where("planId", "==", planId)
    .get();

  if (tasksSnap.empty) {
    console.log(`[deletePlanTasks] لا توجد مهام مرتبطة بالخطة: ${planId}`);
    return;
  }

  const batch = db.batch();
  tasksSnap.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
  console.log(`[deletePlanTasks] تم حذف جميع المهام المرتبطة بالخطة: ${planId} (${tasksSnap.size} مهام)`);
}
