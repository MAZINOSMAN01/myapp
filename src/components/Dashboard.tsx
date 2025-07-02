import React, { useEffect, useState } from 'react';
import { collection, getDocs, getCountFromServer, query, where } from "firebase/firestore";
import { db } from '../firebase/config.js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, CheckCircle, AlertTriangle } from "lucide-react";
import { Bar, BarChart, Pie, PieChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// --- Interfaces ---
interface DashboardStats {
  totalUsers: number;
  workOrders: {
    open: number;
    completed: number;
    overdue: number;
  };
  isLoading: boolean;
}
interface WorkOrderStatusData {
  name: string;
  value: number;
}
interface MaintenanceCostData {
  name: string;
  cost: number;
}

// قاموس لترجمة واختصار أنواع الصيانة للمخطط الشريطي
const maintenanceTypeTranslations: { [key: string]: string } = {
  'Preventive Maintenance': 'Preventive',
  'Corrective Maintenance (Repair)': 'Corrective',
  'Predictive Maintenance (Inspection)': 'Predictive',
  'Installation': 'Installation'
};

const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const statusTranslations: { [key: string]: string } = { 
  'In Progress': 'قيد التنفيذ', 
  'Completed': 'مكتمل', 
  'Pending': 'معلق', 
  'Scheduled': 'مجدول' 
};

// تعريف إعدادات الألوان للمخططات
const pieChartConfig = {
  value: {
    label: "Work Orders",
  },
  'قيد التنفيذ': {
    label: "قيد التنفيذ",
    color: "hsl(var(--chart-1))",
  },
  'مكتمل': {
    label: "مكتمل",
    color: "hsl(var(--chart-2))",
  },
  'معلق': {
    label: "معلق",
    color: "hsl(var(--chart-3))",
  },
  'مجدول': {
    label: "مجدول",
    color: "hsl(var(--chart-4))",
  },
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
    isLoading: true,
  });

  const [workOrderStatusData, setWorkOrderStatusData] = useState<WorkOrderStatusData[]>([]);
  const [maintenanceCostData, setMaintenanceCostData] = useState<MaintenanceCostData[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const usersSnapshot = await getCountFromServer(collection(db, "users"));
        const workOrdersRef = collection(db, "work_orders");
        const completedQuery = query(workOrdersRef, where("status", "==", "Completed"));
        const openQuery = query(workOrdersRef, where("status", "in", ["Pending", "In Progress", "Scheduled"]));
        
        const [completedCount, openCount, allWorkOrdersSnapshot, maintenanceRecordsSnapshot] = await Promise.all([
          getCountFromServer(completedQuery),
          getCountFromServer(openQuery),
          getDocs(workOrdersRef),
          getDocs(collection(db, "maintenance_records")),
        ]);
        
        setStats({
          totalUsers: usersSnapshot.data().count,
          workOrders: {
            completed: completedCount.data().count,
            open: openCount.data().count,
            overdue: 0, // Note: Overdue logic needs to be implemented separately if required
          },
          isLoading: false,
        });

        const statusCounts: { [key: string]: number } = {};
        allWorkOrdersSnapshot.docs.forEach(doc => {
          const status = doc.data().status || 'Pending';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        const pieData = Object.entries(statusCounts).map(([name, value]) => ({
          name: statusTranslations[name] || name,
          value,
        }));
        setWorkOrderStatusData(pieData);

        const costByType: { [key: string]: number } = {};
        maintenanceRecordsSnapshot.docs.forEach(doc => {
          const record = doc.data();
          const type = record.maintenanceType || 'Uncategorized';
          costByType[type] = (costByType[type] || 0) + (record.cost || 0);
        });
        
        const barData = Object.entries(costByType).map(([name, cost]) => ({
          name: maintenanceTypeTranslations[name] || name,
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Users</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalUsers}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Open Work Orders</CardTitle><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.workOrders.open}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed Work Orders</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.workOrders.completed}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.workOrders.overdue}</div></CardContent></Card>
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
                <Pie data={workOrderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                  {workOrderStatusData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
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
                {/* --- التعديل الوحيد هنا --- */}
                <Bar dataKey="cost" fill="#8884d8" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}