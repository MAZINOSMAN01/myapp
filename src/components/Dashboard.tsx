import React, { useEffect, useState } from 'react';
import { collection, getDocs, getCountFromServer, query, where, Timestamp } from "firebase/firestore";
import { db } from '../firebase/config.js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, CheckCircle, AlertTriangle, ShieldCheck, Wrench } from "lucide-react";
import { Bar, BarChart, Pie, PieChart, XAxis, YAxis, Legend, Cell, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// --- Interfaces ---
interface WorkOrder {
  id: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Scheduled';
  dueDate: string | Timestamp;
  [key: string]: any;
}

interface MaintenanceRecord {
  id: string;
  maintenanceType: string;
  cost?: number;
  [key: string]: any;
}

interface DashboardStats {
  totalUsers: number;
  workOrders: {
    open: number;
    completed: number;
    overdue: number;
  };
  preventiveMaintenance: number;
  correctiveMaintenance: number;
  isLoading: boolean;
}
interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface MaintenanceCostData {
  name: string;
  cost: number;
}

// English translations/mappings for maintenance types
const maintenanceTypeMapping: { [key: string]: string } = {
  'Preventive Maintenance': 'Preventive',
  'Corrective Maintenance (Repair)': 'Corrective',
  'Predictive Maintenance (Inspection)': 'Predictive',
  'Installation': 'Installation'
};

// Define chart colors and configurations in English
const pieChartConfig = {
  "Pending": { label: "Pending", color: "hsl(var(--chart-3))" },
  "In Progress": { label: "In Progress", color: "hsl(var(--chart-1))" },
  "Completed": { label: "Completed", color: "hsl(var(--chart-2))" },
  "Scheduled": { label: "Scheduled", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const barChartConfig = {
  cost: {
    label: "Cost ($)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    workOrders: { open: 0, completed: 0, overdue: 0 },
    preventiveMaintenance: 0,
    correctiveMaintenance: 0,
    isLoading: true,
  });

  const [workOrderStatusData, setWorkOrderStatusData] = useState<ChartData[]>([]);
  const [maintenanceCostData, setMaintenanceCostData] = useState<MaintenanceCostData[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const usersSnapshot = await getCountFromServer(collection(db, "users"));
        const workOrdersRef = collection(db, "work_orders");
        const completedQuery = query(workOrdersRef, where("status", "==", "Completed"));
        const openQuery = query(workOrdersRef, where("status", "in", ["Pending", "In Progress", "Scheduled"]));
        const maintenanceRef = collection(db, "maintenance_records");
        const preventiveQuery = query(maintenanceRef, where("maintenanceType", "==", "Preventive Maintenance"));
        const correctiveQuery = query(maintenanceRef, where("maintenanceType", "==", "Corrective Maintenance (Repair)"));
        
        const [completedCount, openCount, allWorkOrdersSnapshot, maintenanceRecordsSnapshot, preventiveCount, correctiveCount] = await Promise.all([
          getCountFromServer(completedQuery),
          getCountFromServer(openQuery),
          getDocs(workOrdersRef),
          getDocs(maintenanceRef),
          getCountFromServer(preventiveQuery),
          getCountFromServer(correctiveQuery),
        ]);

        const now = new Date();
        const overdueCount = allWorkOrdersSnapshot.docs.reduce((count, doc) => {
          const order = doc.data() as WorkOrder;
          if (order.status !== 'Completed' && order.dueDate) {
            const dueDate = order.dueDate instanceof Timestamp ? order.dueDate.toDate() : new Date(order.dueDate);
            if (dueDate < now) {
              return count + 1;
            }
          }
          return count;
        }, 0);

        setStats({
          totalUsers: usersSnapshot.data().count,
          workOrders: {
            completed: completedCount.data().count,
            open: openCount.data().count,
            overdue: overdueCount,
          },
          preventiveMaintenance: preventiveCount.data().count,
          correctiveMaintenance: correctiveCount.data().count,
          isLoading: false,
        });

        const statusCounts: { [key: string]: number } = {};
        allWorkOrdersSnapshot.docs.forEach(doc => {
          const status = doc.data().status || 'Pending';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // ⭐ FIX: Process data safely for the pie chart
        const pieData = Object.entries(statusCounts).map(([name, value]) => {
          const configEntry = pieChartConfig[name as keyof typeof pieChartConfig];
          return {
            name: configEntry?.label || name,
            value,
            fill: configEntry?.color || "hsl(var(--chart-5))", // Provide a fallback color
          };
        });
        setWorkOrderStatusData(pieData);

        const costByType: { [key: string]: number } = {};
        maintenanceRecordsSnapshot.docs.forEach(doc => {
          const record = doc.data() as MaintenanceRecord;
          const type = record.maintenanceType || 'Uncategorized';
          costByType[type] = (costByType[type] || 0) + (record.cost || 0);
        });
        
        const barData = Object.entries(costByType).map(([name, cost]) => ({
          name: maintenanceTypeMapping[name] || name,
          cost
        }));
        setMaintenanceCostData(barData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };
    fetchDashboardData();
  }, []);

  if (stats.isLoading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Users</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalUsers}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Open Work Orders</CardTitle><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.workOrders.open}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed Work Orders</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.workOrders.completed}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.workOrders.overdue}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Preventive Maintenance</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.preventiveMaintenance}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Corrective Maintenance</CardTitle><Wrench className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.correctiveMaintenance}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Work Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="mx-auto aspect-square h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                {/* ⭐ FIX: Use the fill property directly from the processed data */}
                <Pie data={workOrderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} >
                    {workOrderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Costs by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="aspect-auto h-[300px] w-full">
              <BarChart data={maintenanceCostData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {/* ⭐ FIX: Use the color defined in the chart config */}
                <Bar dataKey="cost" fill={barChartConfig.cost.color} radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}