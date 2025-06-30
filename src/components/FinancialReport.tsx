// src/components/FinancialReport.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase/config.js';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Wrench, Download } from 'lucide-react';

interface CostDistribution { [key: string]: number; }
interface FinancialMetrics { byMaintenanceType: CostDistribution; bySystemType: CostDistribution; }

export function FinancialReport() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateFinancialMetrics = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "maintenance_records"));
        const records = querySnapshot.docs.map(doc => doc.data());
        const byMaintenanceType = records.reduce((acc: CostDistribution, record) => {
          const type = record.maintenanceType || 'Uncategorized';
          acc[type] = (acc[type] || 0) + (record.cost || 0);
          return acc;
        }, {});
        const bySystemType = records.reduce((acc: CostDistribution, record) => {
          const type = record.systemType || 'Uncategorized';
          acc[type] = (acc[type] || 0) + (record.cost || 0);
          return acc;
        }, {});
        setMetrics({ byMaintenanceType, bySystemType });
      } catch (error) { console.error("Error calculating financial metrics:", error); }
      finally { setIsLoading(false); }
    };
    calculateFinancialMetrics();
  }, []);

  const handleDownload = (data: CostDistribution, fileNamePrefix: string) => {
    if (!data || Object.keys(data).length === 0) {
        alert("No data to download.");
        return;
    }
    const formattedData = Object.entries(data).map(([category, totalCost]) => ({
        'Category': category,
        'Total Cost': totalCost
    }));

    const csv = Papa.unparse(formattedData, { header: true, delimiter: ';' });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading || !metrics) {
    return <p>Calculating financial reports...</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-gray-500" /><span>Costs by Maintenance Type</span></CardTitle>
          <Button variant="outline" size="icon" onClick={() => handleDownload(metrics.byMaintenanceType, 'costs_by_maintenance_type')}><Download className="h-4 w-4"/></Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Object.entries(metrics.byMaintenanceType).map(([type, total]) => (
            <div key={type} className="flex justify-between border-b pb-1"><span>{type}</span><span className="font-bold">{formatCurrency(total)}</span></div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-gray-500" /><span>Costs by System Type</span></CardTitle>
           <Button variant="outline" size="icon" onClick={() => handleDownload(metrics.bySystemType, 'costs_by_system_type')}><Download className="h-4 w-4"/></Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Object.entries(metrics.bySystemType).map(([type, total]) => (
            <div key={type} className="flex justify-between border-b pb-1"><span>{type}</span><span className="font-bold">{formatCurrency(total)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}