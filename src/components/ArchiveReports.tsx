// src/components/ArchiveReports.tsx
// Improved and Type-Safe Version
// Depends on Firestore interfaces and converter from src/types/firestoreArchive.ts
// ─────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  CollectionReference,
  Query,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import Papa from "papaparse";

// shadcn/ui
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Download, Search, Calendar, Archive, Filter } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Firestore Types + Generic Converter
import {
  MaintenanceTaskDoc,
  WorkOrderDoc,
  IssueLogDoc,
  InspectionRecordDoc,
  genericConverter,
} from "@/types/firestoreArchive";

// ─────────────────────────────────────────────────────────────────────
// UI Component Types
// ─────────────────────────────────────────────────────────────────────

type SourceDoc =
  | MaintenanceTaskDoc
  | WorkOrderDoc
  | IssueLogDoc
  | InspectionRecordDoc;

interface ArchiveRecord {
  id: string;
  type: "maintenance" | "work_order" | "issue" | "inspection";
  title: string;
  description: string;
  status: string;
  date: Timestamp | null;
  archivedAt: Timestamp | null;
  cost?: number;
  assignedTo?: string;
  assetName?: string;
  completedBy?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

export function ArchiveReports() {
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("maintenance");

  // Search Filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [costFilter, setCostFilter] = useState<string>("all");

  const { toast } = useToast();

  // ─── Search Archive ───────────────────────────────────────────
  const searchArchive = async () => {
    setLoading(true);
    try {
      let archiveQuery: Query<SourceDoc>;
      let collectionName = "";

      // Select collection based on the active tab
      switch (activeTab) {
        case "maintenance":
          collectionName = "maintenance_tasks";
          break;
        case "work_orders":
          collectionName = "work_orders";
          break;
        case "issues":
          collectionName = "issue_logs";
          break;
        case "inspections":
          collectionName = "inspection_records";
          break;
        default:
          collectionName = "maintenance_tasks";
      }

      // Query Constraints
      const constraints: any[] = [];

      // Archived or Completed
      if (activeTab === "maintenance") {
        constraints.push(where("archived", "==", true));
      } else {
        constraints.push(where("status", "in", ["Completed", "Closed", "Resolved"]));
      }

      // Date Filters
      if (dateFrom) {
        constraints.push(where("completedAt", ">=", Timestamp.fromDate(new Date(dateFrom))));
      }
      if (dateTo) {
        constraints.push(
          where(
            "completedAt",
            "<=",
            Timestamp.fromDate(new Date(`${dateTo}T23:59:59`))
          )
        );
      }

      // Status Filter
      if (statusFilter !== "all") {
        constraints.push(where("status", "==", statusFilter));
      }

      // Order and Limit
      constraints.push(orderBy("completedAt", "desc"));
      constraints.push(limit(1000));

      // Create a typed collection reference
      const colRef = (
        collection(db, collectionName) as CollectionReference<SourceDoc>
      ).withConverter(genericConverter<SourceDoc>());

      archiveQuery = query(colRef, ...constraints);

      const snapshot = await getDocs(archiveQuery);

      const archiveData: ArchiveRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          type: activeTab as "maintenance" | "work_order" | "issue" | "inspection",
          title: "taskDescription" in data
            ? data.taskDescription
            : "title" in data
            ? data.title
            : "issueDescription" in data
            ? data.issueDescription
            : "Undefined",
          description:
            ("description" in data && data.description) ||
            ("actionTaken" in data && data.actionTaken) ||
            ("notes" in data && data.notes) ||
            "",
          status: data.status ?? "Undefined",
          date:
            ("completedAt" in data && data.completedAt) ||
            ("resolutionDate" in data && data.resolutionDate) ||
            null,
          archivedAt:
            ("archivedAt" in data && data.archivedAt) ||
            ("closedAt" in data && data.closedAt) ||
            ("updatedAt" in data && data.updatedAt) ||
            null,
          cost: "cost" in data ? data.cost ?? 0 : 0,
          assignedTo:
            ("assignedTo" in data && data.assignedTo) ||
            ("completedBy" in data && data.completedBy) ||
            "",
          assetName: ("assetName" in data && data.assetName) || "",
          completedBy:
            ("completedBy" in data && data.completedBy) ||
            ("resolvedBy" in data && data.resolvedBy) ||
            "",
        } as ArchiveRecord;
      });

      // Text Filter
      const filtered = archiveData.filter((rec) => {
        if (!searchTerm) return true;
        const l = searchTerm.toLowerCase();
        return (
          rec.title.toLowerCase().includes(l) ||
          rec.description.toLowerCase().includes(l) ||
          rec.assetName?.toLowerCase().includes(l)
        );
      });

      // Cost Filter
      const costFiltered = filtered.filter((rec) => {
        if (costFilter === "all") return true;
        const c = rec.cost ?? 0;
        if (costFilter === "low") return c < 500;
        if (costFilter === "medium") return c >= 500 && c < 2000;
        return c >= 2000; // high
      });

      setRecords(costFiltered);

      toast({
        title: "Search Successful",
        description: `Found ${costFiltered.length} records in the archive.`,
      });
    } catch (err) {
      console.error("Search Error:", err);
      toast({
        title: "Search Error",
        description: "Failed to search the archive. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Export to CSV ───────────────────────────────────────────────
  const exportToCSV = () => {
    if (records.length === 0) {
      toast({
        title: "No Data",
        description: "There are no records to export.",
        variant: "destructive",
      });
      return;
    }

    const csvData = records.map((r) => ({
      "Type": r.type,
      "Title": r.title,
      "Description": r.description,
      "Status": r.status,
      "Date": formatDate(r.date),
      "Archived Date": formatDate(r.archivedAt),
      "Cost": r.cost ?? 0,
      "Assigned To": r.assignedTo || "N/A",
      "Asset Name": r.assetName || "N/A",
      "Completed By": r.completedBy || "N/A",
    }));

    const csv = Papa.unparse(csvData, { header: true });
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const today = new Date().toISOString().split("T")[0];
    link.download = `archive_report_${activeTab}_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({
      title: "Export Successful",
      description: `Exported ${records.length} records to a CSV file.`,
    });
  };

  // ─── Helpers ────────────────────────────────────────────
  const formatDate = (date: Timestamp | null | undefined) => {
    if (!date) return "N/A";
    return date.toDate().toLocaleDateString("en-US");
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "resolved":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  // ─── JSX ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Archive Reports</h1>
          <p className="text-gray-500">Search and extract historical and archived records</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dates + Text Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="searchTerm">Text Search</Label>
              <Input
                id="searchTerm"
                placeholder="Search in title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Other Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cost Filter</Label>
              <Select value={costFilter} onValueChange={setCostFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cost range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Costs</SelectItem>
                  <SelectItem value="low">Low (&lt; 500 SAR)</SelectItem>
                  <SelectItem value="medium">Medium (500 - 2000 SAR)</SelectItem>
                  <SelectItem value="high">High (&gt; 2000 SAR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={searchArchive} className="w-full" disabled={loading}>
                {loading ? "Searching..." : (<><Search className="h-4 w-4 mr-2" />Search Archive</>)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Archive className="h-4 w-4" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="work_orders" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Work Orders
          </TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Results ({records.length} records)</CardTitle>
            </CardHeader>
            <CardContent>
              {records.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Asset Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Completed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{r.title}</div>
                              {r.description && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {r.description.substring(0, 100)}
                                  {r.description.length > 100 && "..."}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{r.assetName || "N/A"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(r.status)}>{r.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(r.date)}</TableCell>
                          <TableCell>
                            {r.cost ? `${r.cost.toLocaleString()} SAR` : "N/A"}
                          </TableCell>
                          <TableCell>{r.completedBy || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Archive className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Results</h3>
                  <p className="text-gray-500">No records found matching the specified search criteria.</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting the filters or expanding the date range.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// End of File
// ─────────────────────────────────────────────────────────────────────