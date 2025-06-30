// src/components/MaintenanceSummaryReport.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase/config.js';
import Papa from 'papaparse';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Edit } from 'lucide-react';

interface MaintenanceRecord {
  id: string;
  assetName: string;
  maintenanceType: string;
  status: string;
  cost: number;
  date: any;
  description?: string;
  invoiceNumber?: string;
}

const typeTranslations: { [key: string]: string } = { 'Preventive Maintenance': 'صيانة وقائية', 'Corrective Maintenance (Repair)': 'صيانة تصحيحية (إصلاح)', 'Predictive Maintenance (Inspection)': 'صيانة تنبؤية (فحص)', 'Installation': 'تركيب' };
const statusTranslations: { [key: string]: string } = { 'Completed': 'مكتمل', 'Scheduled': 'مجدول', 'In Progress': 'قيد التنفيذ' };
const getStatusColor = (status: string) => { switch (status) { case "Completed": return "bg-green-100 text-green-800"; case "Scheduled": return "bg-purple-100 text-purple-800"; case "In Progress": return "bg-blue-100 text-blue-800"; default: return "bg-gray-100 text-gray-800"; } };

export function MaintenanceSummaryReport() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "maintenance_records"));
      const recordsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord));
      setRecords(recordsData);
    } catch (error) { console.error("Error fetching maintenance records:", error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, []);

  const formatDate = (date: any) => {
    if (!date?.seconds) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  };

  const handleDownloadCSV = () => {
    if (records.length === 0) {
      alert("No data to download.");
      return;
    }
    
    // ** معالجة البيانات لتضمين العناوين المفهومة والبيانات المترجمة **
    const csvData = records.map(record => ({
      'Asset Name': record.assetName,
      'Maintenance Type': typeTranslations[record.maintenanceType] || record.maintenanceType,
      'Status': statusTranslations[record.status] || record.status,
      'Cost': record.cost,
      'Date': formatDate(record.date),
      'Description': record.description || 'N/A',
      'Invoice #': record.invoiceNumber || 'N/A',
    }));

    const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ';',
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maintenance_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Maintenance Summary</CardTitle>
        <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
          <Download className="h-4 w-4 mr-2" /> Download as CSV
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Maintenance Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow> 
            : records.map(record => (
              <TableRow key={record.id}>
                <TableCell className="font-medium text-right">{record.assetName}</TableCell>
                <TableCell>{typeTranslations[record.maintenanceType] || record.maintenanceType}</TableCell>
                <TableCell><Badge className={getStatusColor(record.status)}>{statusTranslations[record.status] || record.status}</Badge></TableCell>
                <TableCell>${(record.cost || 0).toLocaleString()}</TableCell>
                <TableCell>{formatDate(record.date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}