// src/components/Dashboard.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, getCountFromServer, query, where, Timestamp } from "firebase/firestore";
import { db } from '../firebase/config'; // ⭐ إزالة .js من النهاية
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

        const [completedSnapshot, openSnapshot, allWorkOrdersSnapshot, maintenanceSnapshot] = await Promise.all([
          getDocs(completedQuery),
          getDocs(openQuery),
          getDocs(workOrdersRef),
          getDocs(collection(db, "maintenance_tasks"))
        ]);

        // Calculate overdue work orders
        const now = new Date();
        let overdueCount = 0;
        allWorkOrdersSnapshot.docs.forEach(doc => {
          const order = doc.data() as WorkOrder;
          if (order.status !== "Completed" && order.dueDate) {
            const dueDate = typeof order.dueDate === 'string' ? new Date(order.dueDate) : order.dueDate.toDate();
            if (dueDate < now) overdueCount++;
          }
        });

        // Count maintenance types
        let preventiveCount = 0;
        let correctiveCount = 0;
        maintenanceSnapshot.docs.forEach(doc => {
          const task = doc.data();
          if (task.type === 'Preventive') preventiveCount++;
          else if (task.type === 'Corrective') correctiveCount++;
        });

        // Prepare chart data for work order statuses
        const statusCounts: { [key: string]: number } = {
          'Pending': 0,
          'In Progress': 0,
          'Completed': 0,
          'Scheduled': 0
        };

        allWorkOrdersSnapshot.docs.forEach(doc => {
          const order = doc.data() as WorkOrder;
          if (statusCounts.hasOwnProperty(order.status)) {
            statusCounts[order.status]++;
          }
        });

        const chartData: ChartData[] = Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count,
          fill: pieChartConfig[status as keyof typeof pieChartConfig]?.color || '#8884d8'
        }));

        // Prepare maintenance cost data
        const costData: MaintenanceCostData[] = [];
        const maintenanceCosts: { [key: string]: number } = {};

        maintenanceSnapshot.docs.forEach(doc => {
          const record = doc.data() as MaintenanceRecord;
          const mappedType = maintenanceTypeMapping[record.maintenanceType] || record.maintenanceType;
          if (!maintenanceCosts[mappedType]) {
            maintenanceCosts[mappedType] = 0;
          }
          maintenanceCosts[mappedType] += record.cost || 0;
        });

        Object.entries(maintenanceCosts).forEach(([type, cost]) => {
          costData.push({ name: type, cost });
        });

        setStats({
          totalUsers: usersSnapshot.data().count,
          workOrders: {
            open: openSnapshot.size,
            completed: completedSnapshot.size,
            overdue: overdueCount,
          },
          preventiveMaintenance: preventiveCount,
          correctiveMaintenance: correctiveCount,
          isLoading: false,
        });

        setWorkOrderStatusData(chartData);
        setMaintenanceCostData(costData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  if (stats.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your facility management system.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Work Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workOrders.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workOrders.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.workOrders.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preventive Maintenance</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.preventiveMaintenance}</div>
            <p className="text-xs text-muted-foreground">Active preventive tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corrective Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.correctiveMaintenance}</div>
            <p className="text-xs text-muted-foreground">Repair tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Work Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={workOrderStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {workOrderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
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
            <ChartContainer config={barChartConfig} className="h-[300px]">
              <BarChart data={maintenanceCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cost" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}