import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// يُشغَّل كل ليلة الساعة 03:00 بتوقيت الرياض
export const weeklyTaskGenerator = functions.pubsub
  .schedule("0 0 0 * * *")              // كل يوم 00:00 UTC ≈ 03:00 KSA
  .timeZone("Asia/Riyadh")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const oneYear = now.toDate();
    oneYear.setFullYear(oneYear.getFullYear() + 1);

    const plansSnap = await db.collection("maintenance_plans").get();
    const batch = db.batch();
    let created = 0;

    plansSnap.forEach((planDoc) => {
      const plan = planDoc.data() as any;

      // احسب أول تاريخ الإدراج ≥ اليوم
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
    console.log(`Generated ${created} tasks`);
    return null;
  });

// دالة مساعدة لحساب التاريخ التالي حسب التكرار
function nextDate(d: Date, freq: string): Date {
  const n = new Date(d);
  switch (freq) {
    case "Daily":         n.setDate(n.getDate() + 1); break;
    case "Weekly":        n.setDate(n.getDate() + 7); break;
    case "Monthly":       n.setMonth(n.getMonth() + 1); break;
    case "Quarterly":     n.setMonth(n.getMonth() + 3); break;
    case "Semi-annually": n.setMonth(n.getMonth() + 6); break;
    case "Annually":      n.setFullYear(n.getFullYear() + 1); break;
  }
  return n;
}
