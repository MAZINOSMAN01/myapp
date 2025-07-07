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

interface MaintenanceRecord extends DocumentData {
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

const getStatusColor = (status: string) => { switch (status) { case "Completed": return "bg-green-100 text-green-800"; case "Scheduled": return "bg-purple-100 text-purple-800"; case "In Progress": return "bg-blue-100 text-blue-800"; case "Pending": return "bg-yellow-100 text-yellow-800"; case "Skipped": return "bg-red-100 text-red-800"; default: return "bg-gray-100 text-gray-800"; } };

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
      toast({ title: "No Data", description: "There is no data to download for the current filter." });
      return;
    }

    const csvData = recordsToDownload.map(r => ({
      'Asset Name': r.assetName,
      'Maintenance Type': r.maintenanceType,
      'Status': r.status,
      'Cost': r.cost || 0,
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

  const handleResetFilters = () => {
    setFilter('all');
    setStatusFilter('all');
    setSystemFilter('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center mb-4">
          <CardTitle>Maintenance Summary</CardTitle>
          <Button variant="outline" size="icon" onClick={handleDownloadCSV}><Download className="h-4 w-4"/></Button>
        </div>
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/40 rounded-lg">
          {/* Type Filters */}
          <div className="flex items-center gap-2 border-r pr-4">
            {filterOptions.map(option => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(option.value)}
              >{option.label}</Button>
            ))}
          </div>
          {/* Status Filter */}
          <div className="flex-grow min-w-[150px]"><Label htmlFor="status-filter" className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger id="status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All' : s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {/* System Filter */}
          <div className="flex-grow min-w-[150px]"><Label htmlFor="system-filter" className="text-xs">System</Label>
            <Select value={systemFilter} onValueChange={setSystemFilter}><SelectTrigger id="system-filter"><SelectValue placeholder="System" /></SelectTrigger>
              <SelectContent>{systemOptions.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Systems' : s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {/* Date Filters */}
          <div className="flex-grow min-w-[130px]"><Label htmlFor="start-date" className="text-xs">From</Label>
            <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex-grow min-w-[130px]"><Label htmlFor="end-date" className="text-xs">To</Label>
            <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          {/* Reset Button */}
          <div>
            <Button variant="ghost" onClick={handleResetFilters}>Reset</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Asset Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Cost</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.assetName}</TableCell>
                  <TableCell>{record.maintenanceType}</TableCell>
                  <TableCell><Badge className={getStatusColor(record.status)}>{record.status}</Badge></TableCell>
                  <TableCell>${(record.cost || 0).toLocaleString()}</TableCell>
                  <TableCell>{formatDate(record.date)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">No records found for the selected filter.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}