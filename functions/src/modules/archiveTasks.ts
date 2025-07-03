import * as functions from "firebase-functions";
import { DocumentSnapshot } from "firebase-admin/firestore";

const ARCHIVE_AFTER_DAYS = 14;

export function archiveTasks(
  change: functions.Change<DocumentSnapshot>,
  context: functions.EventContext
): Promise<void> | void {
  const afterSnap = change.after;
  if (!afterSnap.exists) return;

  const after = afterSnap.data() as any;
  if (!after) return;

  if (["Completed", "Skipped"].includes(after.status) && !after.archived) {
    const diffDays =
      (Date.now() - after.dueDate.toDate().getTime()) / (1000 * 3600 * 24);

    if (diffDays >= ARCHIVE_AFTER_DAYS) {
      console.log(`Archiving task ${context.params.taskId}`);

      // ‼️ حوِّل Promise<WriteResult> إلى Promise<void>
      return afterSnap.ref.update({ archived: true }).then(() => {});
    }
  }
}
