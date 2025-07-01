// src/components/MaintenanceSummaryReport.tsx

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from 'lucide-react';

const typeTranslations: { [key: string]: string } = { 'Preventive Maintenance': 'صيانة وقائية', 'Corrective Maintenance (Repair)': 'صيانة تصحيحية', 'Predictive Maintenance (Inspection)': 'صيانة تنبؤية' };
const statusTranslations: { [key: string]: string } = { 'Completed': 'مكتمل', 'Scheduled': 'مجدول', 'In Progress': 'قيد التنفيذ' };
const getStatusColor = (status: string) => { switch (status) { case "Completed": return "bg-green-100 text-green-800"; case "Scheduled": return "bg-purple-100 text-purple-800"; default: return "bg-gray-100 text-gray-800"; } };

export function MaintenanceSummaryReport({ data }: { data: any[] }) {
  const [filter, setFilter] = useState('all');

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return data;
    const typeMap: any = {
        'preventive': 'Preventive Maintenance',
        'corrective': 'Corrective Maintenance (Repair)',
        'predictive': 'Predictive Maintenance (Inspection)',
    };
    return data.filter(record => record.maintenanceType === typeMap[filter]);
  }, [data, filter]);

  const formatDate = (date: any) => {
    if (!date?.seconds) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  };
  
  const handleDownloadCSV = () => {
    const recordsToDownload = filteredRecords;
    if (recordsToDownload.length === 0) return alert("No data to download.");

    const csvData = recordsToDownload.map(r => ({
      'Asset Name': r.assetName,
      'Maintenance Type': typeTranslations[r.maintenanceType] || r.maintenanceType,
      'Status': statusTranslations[r.status] || r.status,
      'Cost': r.cost,
      'Date': formatDate(r.date),
    }));

    const csv = Papa.unparse(csvData, { header: true, delimiter: ';' });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maintenance_${filter}_summary.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Maintenance Summary</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
            <Button variant={filter === 'preventive' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('preventive')}>Preventive</Button>
            <Button variant={filter === 'corrective' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('corrective')}>Corrective</Button>
            <Button variant={filter === 'predictive' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('predictive')}>Predictive</Button>
            <Button variant="ghost" size="icon" onClick={handleDownloadCSV}><Download className="h-4 w-4"/></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Asset Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Cost</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredRecords.map(record => (
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