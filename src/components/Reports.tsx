// src/components/Reports.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, getCountFromServer, DocumentData, Timestamp } from "firebase/firestore";
import { db } from '../firebase/config'; // ⭐ تم الإصلاح
import Papa from 'papaparse';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FileText, CalendarDays, BarChart, Clock } from "lucide-react";

import { CustomReportBuilder } from './CustomReportBuilder';
import { WorkOrderSummaryReport } from './WorkOrderSummaryReport';
import { MaintenanceSummaryReport, MaintenanceRecord } from './MaintenanceSummaryReport';
import { FinancialReport } from './FinancialReport';
import { IssueLogReport } from './IssueLogReport';
import { LessonsLearnedReport } from './LessonsLearnedReport';

// This mapping helps standardize maintenance types from different sources
const maintenanceTypeMap: { [key: string]: string } = {
  'Preventive': 'Preventive Maintenance',
  'Corrective': 'Corrective Maintenance (Repair)',
  'Predictive': 'Predictive Maintenance (Inspection)',
};

// Main data structure for all fetched reports
interface ReportData {
  workOrders: DocumentData[];
  maintenanceRecords: MaintenanceRecord[];
  issueLogs: DocumentData[];
  lessonsLearned: DocumentData[];
}

// Stats for the top cards
interface CardStats {
  reportsGenerated: number;
  monthlyReports: number;
  customReports: number;
  scheduledReports: number;
}

// Stats for summary
interface SummaryStats {
  totalWorkOrders: number;
  totalMaintenanceRecords: number;
  totalMaintenanceCost: number;
  isLoading: boolean;
}

const initialReportData: ReportData = {
  workOrders: [],
  maintenanceRecords: [],
  issueLogs: [],
  lessonsLearned: [],
};

export function Reports() {
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalWorkOrders: 0,
    totalMaintenanceRecords: 0,
    totalMaintenanceCost: 0,
    isLoading: true,
  });

  const [cardStats, setCardStats] = useState<CardStats>({
    reportsGenerated: 0,
    monthlyReports: 0,
    customReports: 0,
    scheduledReports: 0,
  });
  
  const [reportData, setReportData] = useState<ReportData>(initialReportData);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      setSummaryStats(prev => ({ ...prev, isLoading: true }));
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const maintenanceRef = collection(db, "maintenance_tasks");
        
        const scheduledQuery = query(maintenanceRef, where("status", "==", "Scheduled"));
        const monthlyQuery = query(maintenanceRef, where("dueDate", ">=", Timestamp.fromDate(startOfMonth)));

        const [
          workOrdersSnapshot,
          maintenanceSnapshot,
          issuesSnapshot,
          lessonsSnapshot,
          scheduledCountSnapshot,
          monthlyCountSnapshot,
          assetsSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "work_orders")),
          getDocs(maintenanceRef),
          getDocs(collection(db, "issue_logs")),
          getDocs(collection(db, "lessons_learned")),
          getCountFromServer(scheduledQuery),
          getCountFromServer(monthlyQuery),
          getDocs(collection(db, "assets")),
        ]);

        const assetsMap = new Map(assetsSnapshot.docs.map(doc => [doc.id, doc.data().name]));
        
        const maintenanceData: MaintenanceRecord[] = maintenanceSnapshot.docs.map(doc => {
          const task = doc.data();
          return {
            id: doc.id,
            assetName: assetsMap.get(task.assetId) || 'Unknown Asset',
            maintenanceType: maintenanceTypeMap[task.type] || task.type,
            status: task.status,
            cost: task.cost || 0,
            date: task.dueDate,
          } as MaintenanceRecord;
        });

        const workOrdersData = workOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const issuesData = issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setReportData({
          workOrders: workOrdersData,
          maintenanceRecords: maintenanceData,
          issueLogs: issuesData,
          lessonsLearned: lessonsData,
        });

        const totalMaintenanceCost = maintenanceData.reduce((sum, record) => sum + (record.cost || 0), 0);
        
        setSummaryStats({
          totalWorkOrders: workOrdersSnapshot.size,
          totalMaintenanceRecords: maintenanceSnapshot.size,
          totalMaintenanceCost,
          isLoading: false,
        });

        setCardStats({
          reportsGenerated: maintenanceSnapshot.size,
          monthlyReports: monthlyCountSnapshot.data().count,
          customReports: 0,
          scheduledReports: scheduledCountSnapshot.data().count,
        });

      } catch (error) {
        console.error("Error fetching all report data:", error);
        setSummaryStats({
          totalWorkOrders: 0,
          totalMaintenanceRecords: 0,
          totalMaintenanceCost: 0,
          isLoading: false
        });
        setReportData(initialReportData);
      }
    };
    fetchAllData();
  }, []);

  // ⭐ إصلاح: تحديث دالة handleGenerateCustomReport لتتوافق مع CustomReportBuilder
  const handleGenerateCustomReport = (data: DocumentData[], columns: string[], dataSource: keyof ReportData) => {
    if (!data || data.length === 0) {
      alert("No data available for the selected source.");
      return;
    }

    const filteredData = data.map(item => {
      const filtered: { [key: string]: any } = {};
      columns.forEach(col => {
        filtered[col] = item[col] || 'N/A';
      });
      return filtered;
    });

    const csv = Papa.unparse(filteredData, { header: true, delimiter: ',' });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `custom_report_${dataSource}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    setIsBuilderOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Generate and view maintenance reports.</p>
        </div>
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Custom Report Builder</DialogTitle>
              <DialogDescription>
                Select data source and columns to generate a custom report.
              </DialogDescription>
            </DialogHeader>
            {/* ⭐ إصلاح: إزالة prop onClose غير المطلوب */}
            <CustomReportBuilder
              onGenerate={handleGenerateCustomReport}
              reportData={reportData}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.isLoading ? "..." : summaryStats.totalWorkOrders}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Records</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.isLoading ? "..." : summaryStats.totalMaintenanceRecords}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Maintenance Cost</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summaryStats.isLoading ? "..." : summaryStats.totalMaintenanceCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.isLoading ? "..." : cardStats.scheduledReports}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="maintenance">Maintenance Summary</TabsTrigger>
          <TabsTrigger value="workorders">Work Orders</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="issues">Issue Log</TabsTrigger>
          <TabsTrigger value="lessons">Lessons Learned</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance">
          <MaintenanceSummaryReport data={reportData.maintenanceRecords} />
        </TabsContent>

        <TabsContent value="workorders">
          <WorkOrderSummaryReport data={reportData.workOrders} />
        </TabsContent>

        <TabsContent value="financial">
          {/* ⭐ إصلاح: تبسيط props FinancialReport */}
          <FinancialReport />
        </TabsContent>

        <TabsContent value="issues">
          <IssueLogReport data={reportData.issueLogs} />
        </TabsContent>

        <TabsContent value="lessons">
          <LessonsLearnedReport data={reportData.lessonsLearned} />
        </TabsContent>
      </Tabs>
    </div>
  );
}