// src/components/WorkOrderSummaryReport.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase/config.js';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// -- تم نقل دوال الألوان إلى خارج المكون، وهذا أفضل للممارسة --
const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-800";
    case "In Progress": return "bg-blue-100 text-blue-800";
    case "Pending": return "bg-yellow-100 text-yellow-800";
    case "Scheduled": return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High": return "bg-red-100 text-red-800";
    case "Medium": return "bg-orange-100 text-orange-800";
    case "Low": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const statusTranslations: { [key: string]: string } = { 'In Progress': 'قيد التنفيذ', 'Completed': 'مكتمل', 'Pending': 'معلق', 'Scheduled': 'مجدول' };
const priorityTranslations: { [key: string]: string } = { 'High': 'عالية', 'Medium': 'متوسطة', 'Low': 'منخفضة' };

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
}

export function WorkOrderSummaryReport() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchWorkOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "work_orders"));
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<WorkOrder, 'id'>) }));
        setWorkOrders(ordersData);
      } catch (error) { console.error("Error fetching work orders for report:", error); } 
      finally { setIsLoading(false); }
    };
    fetchWorkOrders();
  }, []);

  const handleDownloadCSV = () => {
    if (workOrders.length === 0) {
      alert("No data to download.");
      return;
    }
    const csv = Papa.unparse(workOrders, {
        columns: ['title', 'status', 'priority', 'assignedTo', 'dueDate'],
        header: true,
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // ** تعديل: إضافة BOM لـ Excel **
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = `work_order_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <p>Loading work order summary...</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Work Order Summary</CardTitle>
        <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
          <Download className="h-4 w-4 mr-2" />
          Download as CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.length > 0 ? (
                workOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-right">{order.title}</TableCell>
                    <TableCell><Badge className={getStatusColor(order.status)}>{statusTranslations[order.status] || order.status}</Badge></TableCell>
                    <TableCell><Badge className={getPriorityColor(order.priority)}>{priorityTranslations[order.priority] || order.priority}</Badge></TableCell>
                    <TableCell className="text-right">{order.assignedTo}</TableCell>
                    <TableCell>{order.dueDate}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center">No work orders found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}