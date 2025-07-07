// ────────────────────────────────────────────────────────────────
//  archiveReportsGenerator.ts
//  وحدة مساعدة لتوليد تقارير الأرشيف والبحث المتقدّم وتحويل CSV
//  تُستخدم داخل Cloud Functions (v2)
// ────────────────────────────────────────────────────────────────

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// ─── أنواع البيانات العامة ─────────────────────────────────────

export interface ArchiveReportRequest {
  reportType: "maintenance" | "work_orders" | "issues" | "inspections" | "all";
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  status?: string;   // حالة مخصصة أو "all"
  includeFinancials?: boolean;
  format: "json" | "csv";
  requestedBy: string; // UID
}

export interface ArchiveReportResponse {
  success: boolean;
  data?: any[];
  downloadUrl?: string;
  recordCount: number;
  generatedAt: string;
  error?: string;
}

// ─── الدالة الرئيسة: توليد تقرير الأرشيف ─────────────────────────

/**
 * يولّد تقرير أرشيفي بحسب معايير البحث، ويعيد البيانات كاملة في الذاكرة.
 * لتقارير ضخمة >10 آلاف سجل، يُنصح بالتجزئة أو التصدير إلى Cloud Storage.
 */
export async function generateArchiveReport(
  request: ArchiveReportRequest
): Promise<ArchiveReportResponse> {
  const db = admin.firestore();

  try {
    logger.info("🏗️ Starting archive report generation", {
      reportType: request.reportType,
      dateRange: `${request.dateFrom ?? "*"} → ${request.dateTo ?? "*"}`,
      requestedBy: request.requestedBy,
    });

    const allData: any[] = [];

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
      const dateA = a.completedAt?.toDate?.() ?? new Date(0);
      const dateB = b.completedAt?.toDate?.() ?? new Date(0);
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
  } catch (error) {
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

async function fetchMaintenanceArchive(
  db: admin.firestore.Firestore,
  request: ArchiveReportRequest
) {
  try {
    let q: admin.firestore.Query = db
      .collection("maintenance_tasks")
      .where("archived", "==", true);

    if (request.dateFrom) {
      q = q.where(
        "completedAt",
        ">=",
        admin.firestore.Timestamp.fromDate(new Date(request.dateFrom))
      );
    }
    if (request.dateTo) {
      q = q.where(
        "completedAt",
        "<=",
        admin.firestore.Timestamp.fromDate(
          new Date(`${request.dateTo}T23:59:59`)
        )
      );
    }
    if (request.status && request.status !== "all") {
      q = q.where("status", "==", request.status);
    }

    const snap = await q.limit(5000).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "maintenance_tasks" }));
  } catch (e) {
    logger.error("Error fetching maintenance archive", { error: e });
    return [];
  }
}

async function fetchWorkOrdersArchive(
  db: admin.firestore.Firestore,
  request: ArchiveReportRequest
) {
  try {
    let q: admin.firestore.Query = db
      .collection("work_orders")
      .where("status", "in", ["Completed", "Closed", "Cancelled"]);

    if (request.dateFrom) {
      q = q.where(
        "completedAt",
        ">=",
        admin.firestore.Timestamp.fromDate(new Date(request.dateFrom))
      );
    }
    if (request.dateTo) {
      q = q.where(
        "completedAt",
        "<=",
        admin.firestore.Timestamp.fromDate(
          new Date(`${request.dateTo}T23:59:59`)
        )
      );
    }

    const snap = await q.limit(5000).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "work_orders" }));
  } catch (e) {
    logger.error("Error fetching work orders archive", { error: e });
    return [];
  }
}

async function fetchIssuesArchive(
  db: admin.firestore.Firestore,
  request: ArchiveReportRequest
) {
  try {
    let q: admin.firestore.Query = db
      .collection("issue_logs")
      .where("status", "in", ["Resolved", "Closed"]);

    if (request.dateFrom) {
      q = q.where(
        "resolutionDate",
        ">=",
        admin.firestore.Timestamp.fromDate(new Date(request.dateFrom))
      );
    }
    if (request.dateTo) {
      q = q.where(
        "resolutionDate",
        "<=",
        admin.firestore.Timestamp.fromDate(
          new Date(`${request.dateTo}T23:59:59`)
        )
      );
    }

    const snap = await q.limit(5000).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "issue_logs" }));
  } catch (e) {
    logger.error("Error fetching issues archive", { error: e });
    return [];
  }
}

async function fetchInspectionsArchive(
  db: admin.firestore.Firestore,
  request: ArchiveReportRequest
) {
  try {
    let q: admin.firestore.Query = db
      .collection("inspection_records")
      .where("status", "==", "Completed");

    if (request.dateFrom) {
      q = q.where(
        "completedAt",
        ">=",
        admin.firestore.Timestamp.fromDate(new Date(request.dateFrom))
      );
    }
    if (request.dateTo) {
      q = q.where(
        "completedAt",
        "<=",
        admin.firestore.Timestamp.fromDate(
          new Date(`${request.dateTo}T23:59:59`)
        )
      );
    }

    const snap = await q.limit(5000).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), collectionSource: "inspection_records" }));
  } catch (e) {
    logger.error("Error fetching inspections archive", { error: e });
    return [];
  }
}

// ─── إنشاء ملخص التقرير ────────────────────────────────────────

function generateReportSummary(data: any[], request: ArchiveReportRequest) {
  const summary = {
    totalRecords: data.length,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    byMonth: {} as Record<string, number>,
    totalCost: 0,
    averageCost: 0,
    dateRange: {
      from: request.dateFrom ?? "غير محدد",
      to: request.dateTo ?? "غير محدد",
    },
  };

  data.forEach((rec) => {
    // حسب النوع
    summary.byType[rec.type] = (summary.byType[rec.type] ?? 0) + 1;

    // حسب الحالة
    if (rec.status) {
      summary.byStatus[rec.status] = (summary.byStatus[rec.status] ?? 0) + 1;
    }

    // حسب الشهر (YYYY‑MM)
    const monthKey = rec.completedAt?.toDate
      ? rec.completedAt.toDate().toISOString().slice(0, 7)
      : "غير محدد";
    summary.byMonth[monthKey] = (summary.byMonth[monthKey] ?? 0) + 1;

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
export function convertToCSV(rows: any[]): string {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const csvLines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];

  return csvLines.join("\n");
}

// ─── البحث المتقدّم في الأرشيف ─────────────────────────────────

export interface AdvancedSearchParams {
  collections?: ("maintenance" | "work_orders" | "issues" | "inspections")[];
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  keywords?: string;
  limit?: number; // حد أقصى للنتائج بكل مجموعة
}

export async function advancedArchiveSearch(
  params: AdvancedSearchParams
): Promise<any[]> {
  const db = admin.firestore();
  const results: any[] = [];

  const collections =
    params.collections ?? ["maintenance", "work_orders", "issues", "inspections"];

  const dateFromTs = params.dateFrom
    ? admin.firestore.Timestamp.fromDate(new Date(params.dateFrom))
    : null;
  const dateToTs = params.dateTo
    ? admin.firestore.Timestamp.fromDate(new Date(`${params.dateTo}T23:59:59`))
    : null;

  await Promise.all(
    collections.map(async (col) => {
      let q: admin.firestore.Query;

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
      if (dateFromTs) q = q.where("completedAt", ">=", dateFromTs);
      if (dateToTs) q = q.where("completedAt", "<=", dateToTs);

      // فلاتر الحالة (Firestore in ≤10 عناصر)
      if (params.status && params.status.length) {
        q = q.where("status", "in", params.status.slice(0, 10));
      }

      const snap = await q.limit(params.limit ?? 500).get();

      snap.docs.forEach((d) => {
        const data = d.data();
        if (params.keywords) {
          const flat = JSON.stringify(data).toLowerCase();
          if (!flat.includes(params.keywords.toLowerCase())) return;
        }
        results.push({ id: d.id, ...data, collectionSource: col });
      });
    })
  );

  // ترتيب النتائج حسب التاريخ تنازليًا
  results.sort(
    (a, b) =>
      (b.completedAt?.toDate?.() ?? 0) - (a.completedAt?.toDate?.() ?? 0)
  );

  return results;
}

// ────────────────────────────────────────────────────────────────
//  نهاية الملف
// ────────────────────────────────────────────────────────────────
