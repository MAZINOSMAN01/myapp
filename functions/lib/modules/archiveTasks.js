"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveTasks = archiveTasks;
const ARCHIVE_AFTER_DAYS = 14;
function archiveTasks(change, context) {
    const afterSnap = change.after;
    if (!afterSnap.exists)
        return;
    const after = afterSnap.data();
    if (!after)
        return;
    if (["Completed", "Skipped"].includes(after.status) && !after.archived) {
        const diffDays = (Date.now() - after.dueDate.toDate().getTime()) / (1000 * 3600 * 24);
        if (diffDays >= ARCHIVE_AFTER_DAYS) {
            console.log(`Archiving task ${context.params.taskId}`);
            // ‼️ حوِّل Promise<WriteResult> إلى Promise<void>
            return afterSnap.ref.update({ archived: true }).then(() => { });
        }
    }
}
//# sourceMappingURL=archiveTasks.js.map