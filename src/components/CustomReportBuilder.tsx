import React, { useState, useMemo } from 'react';
import { DocumentData } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ReportData {
  workOrders: DocumentData[];
  maintenanceRecords: DocumentData[];
  issueLogs: DocumentData[];
  lessonsLearned: DocumentData[];
}

interface CustomReportBuilderProps {
  reportData: ReportData;
  // ** تعديل: تحديث نوع الدالة لتستقبل dataSource **
  onGenerate: (data: DocumentData[], columns: string[], dataSource: keyof ReportData) => void;
}

const availableColumns: { [key: string]: string[] } = {
  workOrders: ['title', 'status', 'priority', 'assignedTo', 'dueDate', 'facilityName'],
  maintenanceRecords: ['assetName', 'maintenanceType', 'status', 'cost', 'scheduledDate', 'completedDate'],
  issueLogs: ['description', 'status', 'reportedBy', 'createdAt'],
  lessonsLearned: ['title', 'category', 'impact', 'recommendation'],
};

export function CustomReportBuilder({ reportData, onGenerate }: CustomReportBuilderProps) {
  const [dataSource, setDataSource] = useState<keyof ReportData>('workOrders');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(availableColumns['workOrders']);

  const handleDataSourceChange = (value: keyof ReportData) => {
    setDataSource(value);
    setSelectedColumns(availableColumns[value]);
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const selectedData = useMemo(() => reportData[dataSource] || [], [reportData, dataSource]);

  const handleGenerateClick = () => {
    // ** تعديل: تمرير dataSource كمعامل ثالث **
    onGenerate(selectedData, selectedColumns, dataSource);
  };

  return (
    <div className="space-y-6 p-2">
      <div className="space-y-2">
        <Label htmlFor="dataSource">1. Select Data Source</Label>
        <Select onValueChange={handleDataSourceChange} defaultValue={dataSource}>
          <SelectTrigger id="dataSource">
            <SelectValue placeholder="Select a data source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="workOrders">Work Orders</SelectItem>
            <SelectItem value="maintenanceRecords">Maintenance Records</SelectItem>
            <SelectItem value="issueLogs">Issue Logs</SelectItem>
            <SelectItem value="lessonsLearned">Lessons Learned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>2. Select Columns</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
          {availableColumns[dataSource].map(column => (
            <div key={column} className="flex items-center space-x-2">
              <Checkbox
                id={column}
                checked={selectedColumns.includes(column)}
                onCheckedChange={() => handleColumnToggle(column)}
              />
              <Label htmlFor={column} className="capitalize text-sm font-normal">
                {column.replace(/([A-Z])/g, ' $1')}
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleGenerateClick}>Generate Report</Button>
      </div>
    </div>
  );
}