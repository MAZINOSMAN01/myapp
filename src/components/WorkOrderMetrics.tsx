// src/components/WorkOrderMetrics.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase/config.js';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Check, BarChart2 } from 'lucide-react';

// Define the shape of our calculated metrics
interface Metrics {
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byEmployee: { [employee: string]: number };
}

export function WorkOrderMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateMetrics = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "work_orders"));
        const workOrders = querySnapshot.docs.map(doc => doc.data());

        // 1. Calculate distribution by priority
        const byPriority = workOrders.reduce((acc, order) => {
          if (order.priority === 'High') acc.high++;
          else if (order.priority === 'Medium') acc.medium++;
          else if (order.priority === 'Low') acc.low++;
          return acc;
        }, { high: 0, medium: 0, low: 0 });
        
        // 2. Calculate completed orders per employee
        const byEmployee = workOrders
          .filter(order => order.status === 'Completed' && order.assignedTo)
          .reduce((acc: { [key: string]: number }, order) => {
            acc[order.assignedTo] = (acc[order.assignedTo] || 0) + 1;
            return acc;
          }, {});

        setMetrics({ byPriority, byEmployee });
      } catch (error) {
        console.error("Error calculating work order metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateMetrics();
  }, []);

  if (isLoading) {
    return <p className="mt-4">Calculating performance metrics...</p>;
  }

  if (!metrics) {
    return <p className="mt-4">Could not load metrics.</p>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Priority Distribution Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-gray-500" />
              <span>By Priority</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>High Priority:</span> <span className="font-bold">{metrics.byPriority.high}</span></div>
            <div className="flex justify-between"><span>Medium Priority:</span> <span className="font-bold">{metrics.byPriority.medium}</span></div>
            <div className="flex justify-between"><span>Low Priority:</span> <span className="font-bold">{metrics.byPriority.low}</span></div>
          </CardContent>
        </Card>

        {/* Completed by Employee Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-gray-500" />
              <span>Completed Tasks by Employee</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(metrics.byEmployee).length > 0 ? (
              Object.entries(metrics.byEmployee).map(([employee, count]) => (
                <div key={employee} className="flex justify-between border-b pb-1">
                  <span>{employee}</span>
                  <span className="font-bold">{count} tasks</span>
                </div>
              ))
            ) : (
              <p>No completed tasks found.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}