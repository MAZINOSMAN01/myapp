// src/components/Reports.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, getCountFromServer } from "firebase/firestore";
import { db } from '../firebase/config.js';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CalendarDays, BarChart, Clock, Wrench, DollarSign } from "lucide-react";

// استيراد مكونات التقارير
import { WorkOrderSummaryReport } from './WorkOrderSummaryReport';
import { MaintenanceSummaryReport } from './MaintenanceSummaryReport';
import { FinancialReport } from './FinancialReport';
import { IssueLogReport } from './IssueLogReport';
import { LessonsLearnedReport } from './LessonsLearnedReport';

export function Reports() {
  const [summaryStats, setSummaryStats] = useState({
    totalWorkOrders: 0,
    totalMaintenanceRecords: 0,
    totalMaintenanceCost: 0,
    scheduledReports: 0, // إضافة جديدة
    isLoading: true,
  });

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const maintenanceRef = collection(db, "maintenance_records");
        const scheduledQuery = query(maintenanceRef, where("status", "==", "Scheduled"));

        const [workOrdersSnapshot, maintenanceSnapshot, scheduledCount] = await Promise.all([
          getDocs(collection(db, "work_orders")),
          getDocs(maintenanceRef),
          getCountFromServer(scheduledQuery),
        ]);

        const totalWorkOrders = workOrdersSnapshot.size;
        const maintenanceRecords = maintenanceSnapshot.docs.map(doc => doc.data());
        const totalMaintenanceRecords = maintenanceSnapshot.size;
        const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
        
        setSummaryStats({
          totalWorkOrders,
          totalMaintenanceRecords,
          totalMaintenanceCost,
          scheduledReports: scheduledCount.data().count,
          isLoading: false,
        });

      } catch (error) {
        console.error("Error fetching summary data:", error);
        setSummaryStats(prevStats => ({ ...prevStats, isLoading: false }));
      }
    };
    fetchSummaryData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Generate and manage facility reports</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Report
        </Button>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Reports Generated</CardTitle><FileText className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">342</div><p className="text-xs text-gray-500">+18% from last month</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Monthly Reports</CardTitle><CalendarDays className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">28</div><p className="text-xs text-gray-500">+12% from last month</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Custom Reports</CardTitle><BarChart className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">15</div><p className="text-xs text-gray-500">+5% from last month</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Scheduled Reports</CardTitle><Clock className="h-4 w-4 text-gray-500" /></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.scheduledReports}</div>
            <p className="text-xs text-gray-500">currently scheduled</p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Overall Summary</h2>
        {summaryStats.isLoading ? <p>Loading summary data...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardHeader><CardTitle>Total Work Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.totalWorkOrders}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Maintenance Records</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summaryStats.totalMaintenanceRecords}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Maintenance Cost</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${summaryStats.totalMaintenanceCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent></Card>
          </div>
        )}
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
          
          <TabsContent value="work_orders" className="mt-4"><WorkOrderSummaryReport /></TabsContent>
          <TabsContent value="maintenance" className="mt-4"><MaintenanceSummaryReport /></TabsContent>
          <TabsContent value="issue_log" className="mt-4"><IssueLogReport /></TabsContent>
          <TabsContent value="lessons_learned" className="mt-4"><LessonsLearnedReport /></TabsContent>
          <TabsContent value="financial" className="mt-4"><FinancialReport /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}