import * as admin from "firebase-admin";

/**
 * دالة مساعدة لتوليد مهام الصيانة المستقبلية لكل خطة.
 * يمكن استدعاؤها من أي Cloud Function (مثلاً: جدولة أو Trigger).
 * @param db مرجع قاعدة بيانات Firestore (مثلاً: admin.firestore())
 */
export async function generateWeeklyTasks(db: FirebaseFirestore.Firestore) {
  const now = admin.firestore.Timestamp.now();
  const oneYear = now.toDate();
  oneYear.setFullYear(oneYear.getFullYear() + 1);

  const plansSnap = await db.collection("maintenance_plans").get();
  const batch = db.batch();
  let created = 0;

  plansSnap.forEach((planDoc) => {
    const plan = planDoc.data() as any;

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
      (plan.tasks || []).forEach((desc: string) => {
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
function nextDate(d: Date, freq: string): Date {
  const n = new Date(d);
  switch (freq) {
    case "Daily":         n.setDate(n.getDate() + 1); break;
    case "Weekly":        n.setDate(n.getDate() + 7); break;
    case "Monthly":       n.setMonth(n.getMonth() + 1); break;
    case "Quarterly":     n.setMonth(n.getMonth() + 3); break;
    case "Semi-annually": n.setMonth(n.getMonth() + 6); break;
    case "Annually":      n.setFullYear(n.getFullYear() + 1); break;
    default:              break;
  }
  return n;
}
