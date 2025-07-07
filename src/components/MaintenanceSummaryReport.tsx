// src/components/MaintenanceSummaryReport.tsx

import React, { useState, useMemo } from 'react';
import type { DocumentData, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// ⭐ تصدير نوع MaintenanceRecord ليتمكن ملف Reports.tsx من استيراده
export interface MaintenanceRecord extends DocumentData {
  id: string;
  assetName: string;
  maintenanceType: string;
  status: string;
  cost?: number;
  date?: Timestamp;
}

type FilterType = 'all' | 'preventive' | 'corrective' | 'predictive';

const filterOptions: { value: FilterType, label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'predictive', label: 'Predictive' },
];

const MAINTENANCE_TYPE_MAP: Record<FilterType, string | null> = {
  all: null,
  preventive: 'Preventive Maintenance',
  corrective: 'Corrective Maintenance (Repair)',
  predictive: 'Predictive Maintenance (Inspection)',
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-800";
    case "Scheduled": return "bg-purple-100 text-purple-800";
    case "In Progress": return "bg-blue-100 text-blue-800";
    case "Pending": return "bg-yellow-100 text-yellow-800";
    case "Skipped": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const statusOptions = ['all', 'Pending', 'Scheduled', 'In Progress', 'Completed', 'Skipped'];

export function MaintenanceSummaryReport({ data }: { data: MaintenanceRecord[] }) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [systemFilter, setSystemFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { toast } = useToast();

  const systemOptions = useMemo(() => {
    const systems = new Set(data.map(record => record.assetName));
    return ['all', ...Array.from(systems)];
  }, [data]);

  const filteredRecords = useMemo(() => {
    return data.filter(record => {
      // Filter by Type
      if (filter !== 'all' && record.maintenanceType !== MAINTENANCE_TYPE_MAP[filter]) {
        return false;
      }
      // Filter by Status
      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }
      // Filter by System
      if (systemFilter !== 'all' && record.assetName !== systemFilter) {
        return false;
      }
      // Filter by Date Range
      if (startDate && (!record.date || record.date.toDate() < new Date(startDate))) {
        return false;
      }
      if (endDate && (!record.date || record.date.toDate() > new Date(new Date(endDate).setHours(23, 59, 59, 999)))) {
        return false;
      }
      return true;
    });
  }, [data, filter, statusFilter, systemFilter, startDate, endDate]);

  const formatDate = (date?: Timestamp) => {
    if (!date?.seconds) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  };
  
  const handleDownloadCSV = () => {
    const recordsToDownload = filteredRecords;
    if (recordsToDownload.length === 0) {
      toast({ 
        title: "No Data", 
        description: "There is no data to download for the current filter.",
        variant: "destructive"
      });
      return;
    }

    const csvData = recordsToDownload.map(record => ({
      'Asset Name': record.assetName,
      'Maintenance Type': record.maintenanceType,
      'Status': record.status,
      'Cost': record.cost || 0,
      'Date': formatDate(record.date),
    }));

    const csv = Papa.unparse(csvData, { header: true, delimiter: ',' });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maintenance_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({ 
      title: "Download Started", 
      description: `Downloaded ${recordsToDownload.length} maintenance records.` 
    });
  };

  const calculateSummary = () => {
    const total = filteredRecords.length;
    const completed = filteredRecords.filter(r => r.status === 'Completed').length;
    const pending = filteredRecords.filter(r => r.status === 'Pending').length;
    const totalCost = filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);

    return { total, completed, pending, totalCost };
  };

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Summary Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div>
              <Label htmlFor="typeFilter">Maintenance Type</Label>
              <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>
                      {status === 'all' ? 'All Statuses' : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="systemFilter">System</Label>
              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  {systemOptions.map(system => (
                    <SelectItem key={system} value={system}>
                      {system === 'all' ? 'All Systems' : system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredRecords.length} of {data.length} records
            </p>
            <Button onClick={handleDownloadCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
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
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.assetName}</TableCell>
                      <TableCell>{record.maintenanceType}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${(record.cost || 0).toLocaleString()}</TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No maintenance records found for the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}