import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, getCountFromServer, DocumentData, Timestamp } from "firebase/firestore";
import { db } from '../firebase/config.js';
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
import { MaintenanceSummaryReport } from './MaintenanceSummaryReport';
import { FinancialReport } from './FinancialReport';
import { IssueLogReport } from './IssueLogReport';
import { LessonsLearnedReport } from './LessonsLearnedReport';

interface MaintenanceRecord {
  cost?: number;
  status?: string;
  [key: string]: any;
}

interface ReportData {
  workOrders: DocumentData[];
  maintenanceRecords: DocumentData[];
  issueLogs: DocumentData[];
  lessonsLearned: DocumentData[];
}

interface CardStats {
  reportsGenerated: number;
  monthlyReports: number;
  customReports: number;
  scheduledReports: number;
}

// **تعديل: الحالة الأولية لبيانات التقارير**
const initialReportData: ReportData = {
    workOrders: [],
    maintenanceRecords: [],
    issueLogs: [],
    lessonsLearned: [],
};


export function Reports() {
  const [summaryStats, setSummaryStats] = useState({
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
  
  // **تعديل: استخدام الحالة الأولية المُعرفة مسبقًا**
  const [reportData, setReportData] = useState<ReportData>(initialReportData);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
        setSummaryStats(prev => ({ ...prev, isLoading: true })); // ابدأ التحميل
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const maintenanceRef = collection(db, "maintenance_records");
        
        // قد تحتاج هذه الاستعلامات إلى فهارس في Firestore
        const scheduledQuery = query(maintenanceRef, where("status", "==", "Scheduled"));
        const monthlyQuery = query(maintenanceRef, where("creationDate", ">=", Timestamp.fromDate(startOfMonth)));

        const [
          workOrdersSnapshot,
          maintenanceSnapshot,
          issuesSnapshot,
          lessonsSnapshot,
          scheduledCountSnapshot,
          monthlyCountSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "work_orders")),
          getDocs(maintenanceRef),
          getDocs(collection(db, "issue_logs")),
          getDocs(collection(db, "lessons_learned")),
          getCountFromServer(scheduledQuery),
          getCountFromServer(monthlyQuery),
        ]);

        const workOrdersData = workOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const maintenanceData = maintenanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const issuesData = issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setReportData({
          workOrders: workOrdersData,
          maintenanceRecords: maintenanceData,
          issueLogs: issuesData,
          lessonsLearned: lessonsData,
        });

        const totalWorkOrders = workOrdersSnapshot.size;
        const totalMaintenanceRecords = maintenanceSnapshot.size;
        const totalMaintenanceCost = (maintenanceData as MaintenanceRecord[]).reduce((sum, record) => sum + (record.cost || 0), 0);
        
        setSummaryStats({
          totalWorkOrders,
          totalMaintenanceRecords,
          totalMaintenanceCost,
          isLoading: false,
        });

        setCardStats({
          reportsGenerated: totalMaintenanceRecords,
          monthlyReports: monthlyCountSnapshot.data().count,
          customReports: 0, // يمكنك تحديث هذا لاحقًا
          scheduledReports: scheduledCountSnapshot.data().count,
        });

      } catch (error) {
        console.error("Error fetching all report data:", error);
        // **تعديل: تأكد من تحديث جميع الحالات عند حدوث خطأ**
        setSummaryStats({
            totalWorkOrders: 0,
            totalMaintenanceRecords: 0,
            totalMaintenanceCost: 0,
            isLoading: false
        });
        setReportData(initialReportData); // إعادة التعيين إلى الحالة الأولية الفارغة
      }
    };
    fetchAllData();
  }, []);

  const handleGenerateCustomReport = (data: DocumentData[], columns: string[], dataSource: keyof ReportData) => {
    if (!data || data.length === 0) {
      alert("No data available for the selected source.");
      setIsBuilderOpen(false);
      return;
    }

    const maintenanceTypeReverseTranslations: { [key: string]: string } = {
      'صيانة وقائية': 'Preventive Maintenance',
      'صيانة تصحيحية (إصلاح)': 'Corrective Maintenance (Repair)',
      'صيانة تنبؤية (فحص)': 'Predictive Maintenance (Inspection)',
      'تركيب': 'Installation'
    };
    
    const filteredData = data.map(row => {
      const newRow: { [key: string]: any } = {};
      columns.forEach(col => {
        let value = row[col];
        if (dataSource === 'maintenanceRecords' && col === 'maintenanceType') {
          if (maintenanceTypeReverseTranslations[value]) {
            value = maintenanceTypeReverseTranslations[value];
          }
        }
        newRow[col] = value;
      });
      return newRow;
    });

    const csv = Papa.unparse(filteredData, { columns, header: true });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `custom_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    setIsBuilderOpen(false);
  };


  if (summaryStats.isLoading) {
    return <p>Loading reports...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Generate and manage facility reports</p>
        </div>
        
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Report</DialogTitle>
              <DialogDescription>
                Select a data source and choose the columns you want to include in your report.
              </DialogDescription>
            </DialogHeader>
            <CustomReportBuilder
              reportData={reportData}
              onGenerate={handleGenerateCustomReport}
            />
          </DialogContent>
        </Dialog>
        
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Reports Generated</CardTitle><FileText className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{cardStats.reportsGenerated}</div><p className="text-xs text-gray-500">Total reports</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Monthly Reports</CardTitle><CalendarDays className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{cardStats.monthlyReports}</div><p className="text-xs text-gray-500">This month</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Custom Reports</CardTitle><BarChart className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{cardStats.customReports}</div><p className="text-xs text-gray-500">Feature coming soon</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Scheduled Reports</CardTitle><Clock className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardStats.scheduledReports}</div>
            <p className="text-xs text-gray-500">Currently scheduled</p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Overall Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardHeader><CardTitle>Total Work Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.totalWorkOrders}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Maintenance Records</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.totalMaintenanceRecords}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Maintenance Cost</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${summaryStats.totalMaintenanceCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent></Card>
          </div>
      </div>

      <div className="pt-8">
        <Tabs defaultValue="work_orders" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="work_orders">Work Orders</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="issue_log">Issue Log</TabsTrigger>
            <TabsTrigger value="lessons_learned">Lessons Learned</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="work_orders" className="mt-4"><WorkOrderSummaryReport data={reportData.workOrders} /></TabsContent>
          <TabsContent value="maintenance" className="mt-4"><MaintenanceSummaryReport data={reportData.maintenanceRecords} /></TabsContent>
          <TabsContent value="issue_log" className="mt-4"><IssueLogReport data={reportData.issueLogs} /></TabsContent>
          <TabsContent value="lessons_learned" className="mt-4"><LessonsLearnedReport data={reportData.lessonsLearned} /></TabsContent>
          <TabsContent value="financial" className="mt-4"><FinancialReport /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}