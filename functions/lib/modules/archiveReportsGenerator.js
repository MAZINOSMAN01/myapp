"use strict";
// ────────────────────────────────────────────────────────────────
//  archiveReportsGenerator.ts
//  وحدة مساعدة لتوليد تقارير الأرشيف والبحث المتقدّم وتحويل CSV
//  تُستخدم داخل Cloud Functions (v2)
// ────────────────────────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateArchiveReport = generateArchiveReport;
exports.convertToCSV = convertToCSV;
exports.advancedArchiveSearch = advancedArchiveSearch;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
// ─── الدالة الرئيسة: توليد تقرير الأرشيف ─────────────────────────
/**
 * يولّد تقرير أرشيفي بحسب معايير البحث، ويعيد البيانات كاملة في الذاكرة.
 * لتقارير ضخمة >10 آلاف سجل، يُنصح بالتجزئة أو التصدير إلى Cloud Storage.
 */
async function generateArchiveReport(request) {
    var _a, _b;
    const db = admin.firestore();
    try {
        logger.info("🏗️ Starting archive report generation", {
            reportType: request.reportType,
            dateRange: `${(_a = request.dateFrom) !== null && _a !== void 0 ? _a : "*"} → ${(_b = request.dateTo) !== null && _b !== void 0 ? _b : "*"}`,
            requestedBy: request.requestedBy,
        });
        const allData = [];
        // ─── جمع البيانات حسب الأنواع المطلوبة ─────────────────────
        if (request.reportType === "all" || request.reportType === "maintenance") {
            const maintenanceData = await fetchMaintenanceArchive(db, request);
            allData.push(...maintenanceData.map((d) => ({ ...d, type: "maintenance" })));
        }
        if (request.reportType === "all" || request.reportType === "work_orders") {
            const workData = await fetchWorkOrdersArchive(db, request);
            allData.push(...workData.map((d) => ({ ...d, type: "work_order" })));
        }
        if (request.reportType === "all" || request.reportType === "issues") {
            const issueData = await fetchIssuesArchive(db, request);
            allData.push(...issueData.map((d) => ({ ...d, type: "issue" })));
        }
        if (request.reportType === "all" || request.reportType === "inspections") {
            const inspData = await fetchInspectionsArchive(db, request);
            allData.push(...inspData.map((d) => ({ ...d, type: "inspection" })));
        }
        // ─── ترتيب تنازلي حسب تاريخ الإكمال ──────────────────────
        allData.sort((a, b) => {
            var _a, _b, _c, _d, _e, _f;
            const dateA = (_c = (_b = (_a = a.completedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : new Date(0);
            const dateB = (_f = (_e = (_d = b.completedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
        // ─── ملخص التقرير ────────────────────────────────────────
        const summary = generateReportSummary(allData, request);
        // ─── تخزين نسخة مصغرة في مجموعة generated_reports ───────
        const reportRef = await db.collection("generated_reports").add({
            type: "archive_report",
            requestDetails: request,
            summary,
            recordCount: allData.length,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            generatedBy: request.requestedBy,
            dataSnapshot: allData.slice(0, 10), // عينة للتدقيق السريع
        });
        logger.info("✅ Archive report generated successfully", {
            reportId: reportRef.id,
            recordCount: allData.length,
        });
        return {
            success: true,
            data: allData,
            recordCount: allData.length,
            generatedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        logger.error("❌ Error generating archive report", {
            error: error instanceof Error ? error.message : String(error),
            request,
        });
        return {
            success: false,
            recordCount: 0,
            generatedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
// ────────────────────────────────────────────────────────────────
//  Helpers: جلب بيانات الأرشيف حسب المجموعة
// ────────────────────────────────────────────────────────────────
async function fetchMaintenanceArchive(db, request) {
    try {
        let q = db
            .collection("maintenance_tasks")
            .where("archived", "==", true);
        if (request.dateFrom) {
            q = q.where("completedAt", ">=", admin.firestore.Timestamp.fromDate(new Date(request.dateFrom)));
        }
        if (request.dateTo) {
            q = q.where("completedAt", "<=", admin.firestore.Timestamp.fromDate(new Date(`${request.dateTo}T23:59:59`)));
        }
        if (request.status && request.status !== "all") {
            q = q.where("status", "==", request.status);
        }
        const snap = await q.limit(5000).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "maintenance_tasks" }));
    }
    catch (e) {
        logger.error("Error fetching maintenance archive", { error: e });
        return [];
    }
}
async function fetchWorkOrdersArchive(db, request) {
    try {
        let q = db
            .collection("work_orders")
            .where("status", "in", ["Completed", "Closed", "Cancelled"]);
        if (request.dateFrom) {
            q = q.where("completedAt", ">=", admin.firestore.Timestamp.fromDate(new Date(request.dateFrom)));
        }
        if (request.dateTo) {
            q = q.where("completedAt", "<=", admin.firestore.Timestamp.fromDate(new Date(`${request.dateTo}T23:59:59`)));
        }
        const snap = await q.limit(5000).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "work_orders" }));
    }
    catch (e) {
        logger.error("Error fetching work orders archive", { error: e });
        return [];
    }
}
async function fetchIssuesArchive(db, request) {
    try {
        let q = db
            .collection("issue_logs")
            .where("status", "in", ["Resolved", "Closed"]);
        if (request.dateFrom) {
            q = q.where("resolutionDate", ">=", admin.firestore.Timestamp.fromDate(new Date(request.dateFrom)));
        }
        if (request.dateTo) {
            q = q.where("resolutionDate", "<=", admin.firestore.Timestamp.fromDate(new Date(`${request.dateTo}T23:59:59`)));
        }
        const snap = await q.limit(5000).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "issue_logs" }));
    }
    catch (e) {
        logger.error("Error fetching issues archive", { error: e });
        return [];
    }
}
async function fetchInspectionsArchive(db, request) {
    try {
        let q = db
            .collection("inspection_records")
            .where("status", "==", "Completed");
        if (request.dateFrom) {
            q = q.where("completedAt", ">=", admin.firestore.Timestamp.fromDate(new Date(request.dateFrom)));
        }
        if (request.dateTo) {
            q = q.where("completedAt", "<=", admin.firestore.Timestamp.fromDate(new Date(`${request.dateTo}T23:59:59`)));
        }
        const snap = await q.limit(5000).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "inspection_records" }));
    }
    catch (e) {
        logger.error("Error fetching inspections archive", { error: e });
        return [];
    }
}
// ─── إنشاء ملخص التقرير ────────────────────────────────────────
function generateReportSummary(data, request) {
    var _a, _b;
    const summary = {
        totalRecords: data.length,
        byType: {},
        byStatus: {},
        byMonth: {},
        totalCost: 0,
        averageCost: 0,
        dateRange: {
            from: (_a = request.dateFrom) !== null && _a !== void 0 ? _a : "غير محدد",
            to: (_b = request.dateTo) !== null && _b !== void 0 ? _b : "غير محدد",
        },
    };
    data.forEach((rec) => {
        var _a, _b, _c, _d;
        // حسب النوع
        summary.byType[rec.type] = ((_a = summary.byType[rec.type]) !== null && _a !== void 0 ? _a : 0) + 1;
        // حسب الحالة
        if (rec.status) {
            summary.byStatus[rec.status] = ((_b = summary.byStatus[rec.status]) !== null && _b !== void 0 ? _b : 0) + 1;
        }
        // حسب الشهر (YYYY‑MM)
        const monthKey = ((_c = rec.completedAt) === null || _c === void 0 ? void 0 : _c.toDate)
            ? rec.completedAt.toDate().toISOString().slice(0, 7)
            : "غير محدد";
        summary.byMonth[monthKey] = ((_d = summary.byMonth[monthKey]) !== null && _d !== void 0 ? _d : 0) + 1;
        // التكاليف
        if (request.includeFinancials && rec.cost) {
            summary.totalCost += Number(rec.cost);
        }
    });
    if (request.includeFinancials && data.length) {
        summary.averageCost = Number((summary.totalCost / data.length).toFixed(2));
    }
    return summary;
}
// ────────────────────────────────────────────────────────────────
//  أدوات مساعدة إضافية
// ────────────────────────────────────────────────────────────────
/**
 * يحوّل مصفوفة كائنات إلى نص CSV (UTF‑8)
 */
function convertToCSV(rows) {
    if (!rows.length)
        return "";
    const headers = Object.keys(rows[0]);
    const escape = (v) => `"${String(v !== null && v !== void 0 ? v : "").replace(/"/g, '""')}"`;
    const csvLines = [
        headers.map(escape).join(","),
        ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
    ];
    return csvLines.join("\n");
}
async function advancedArchiveSearch(params) {
    var _a;
    const db = admin.firestore();
    const results = [];
    const collections = (_a = params.collections) !== null && _a !== void 0 ? _a : ["maintenance", "work_orders", "issues", "inspections"];
    const dateFromTs = params.dateFrom
        ? admin.firestore.Timestamp.fromDate(new Date(params.dateFrom))
        : null;
    const dateToTs = params.dateTo
        ? admin.firestore.Timestamp.fromDate(new Date(`${params.dateTo}T23:59:59`))
        : null;
    await Promise.all(collections.map(async (col) => {
        var _a;
        let q;
        switch (col) {
            case "maintenance":
                q = db.collection("maintenance_tasks").where("archived", "==", true);
                break;
            case "work_orders":
                q = db
                    .collection("work_orders")
                    .where("status", "in", ["Completed", "Closed", "Cancelled"]);
                break;
            case "issues":
                q = db
                    .collection("issue_logs")
                    .where("status", "in", ["Resolved", "Closed"]);
                break;
            case "inspections":
                q = db
                    .collection("inspection_records")
                    .where("status", "==", "Completed");
                break;
            default:
                return;
        }
        // فلاتر التاريخ
        if (dateFromTs)
            q = q.where("completedAt", ">=", dateFromTs);
        if (dateToTs)
            q = q.where("completedAt", "<=", dateToTs);
        // فلاتر الحالة (Firestore in ≤10 عناصر)
        if (params.status && params.status.length) {
            q = q.where("status", "in", params.status.slice(0, 10));
        }
        const snap = await q.limit((_a = params.limit) !== null && _a !== void 0 ? _a : 500).get();
        snap.docs.forEach((d) => {
            const data = d.data();
            if (params.keywords) {
                const flat = JSON.stringify(data).toLowerCase();
                if (!flat.includes(params.keywords.toLowerCase()))
                    return;
            }
            results.push({ id: d.id, ...data, collectionSource: col });
        });
    }));
    // ترتيب النتائج حسب التاريخ تنازليًا
    results.sort((a, b) => { var _a, _b, _c, _d, _e, _f; return ((_c = (_b = (_a = b.completedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 0) - ((_f = (_e = (_d = a.completedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : 0); });
    return results;
}
// ────────────────────────────────────────────────────────────────
//  نهاية الملف
// ────────────────────────────────────────────────────────────────
//# sourceMappingURL=archiveReportsGenerator.js.map