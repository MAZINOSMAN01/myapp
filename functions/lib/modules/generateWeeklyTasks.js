"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyTasks = generateWeeklyTasks;
const firestore_1 = require("firebase-admin/firestore");
/**
 *  يُنشئ مهام كل الأسابيع المتبقية حتى نهاية الشهر لخُطط «Weekly»
 *  ثم يحدِّث الحقل nextGenerationDate إلى أوّل إثنين بعد نهاية الشهر
 */
async function generateWeeklyTasks(db) {
    const today = new Date(); // يُفترض أنّ الوظيفة تعمل يوم الاثنين
    const eom = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    const plansSnap = await db
        .collection("maintenance_plans")
        .where("frequency", "==", "Weekly")
        .where("nextGenerationDate", "<=", firestore_1.Timestamp.fromDate(today))
        .get();
    const batch = db.batch();
    let total = 0;
    for (const planDoc of plansSnap.docs) {
        const plan = planDoc.data();
        const { tasks = [] } = plan;
        for (let due = new Date(today); due <= eom; due.setDate(due.getDate() + 7)) {
            tasks.forEach((desc) => {
                batch.set(planDoc.ref.collection("tasks").doc(), {
                    taskDescription: desc,
                    dueDate: firestore_1.Timestamp.fromDate(new Date(due)),
                    status: "Pending",
                    archived: false,
                });
                total++;
            });
        }
        // الإثنين الأول بعد نهاية الشهر
        const next = new Date(eom);
        next.setDate(eom.getDate() + ((8 - eom.getDay()) % 7 || 7));
        batch.update(planDoc.ref, {
            nextGenerationDate: firestore_1.Timestamp.fromDate(next),
        });
    }
    await batch.commit();
    console.log(`Weekly-generator: ${total} task(s) created.`);
}
//# sourceMappingURL=generateWeeklyTasks.js.map