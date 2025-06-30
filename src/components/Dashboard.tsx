// src/components/Dashboard.tsx

import React, { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer, getDocs } from "firebase/firestore"; // ** إضافة getDocs **
import { db } from '../firebase/config.js';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CheckCircle, Clock, AlertCircle } from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState({
    openOrders: 0,
    completedOrders: 0,
    inProgressOrders: 0,
    overdueOrders: 0,
    totalUsers: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchOptimizedDashboardStats = async () => {
      try {
        const workOrdersRef = collection(db, "work_orders");

        // First, let's get the counts for simple queries
        const completedQuery = query(workOrdersRef, where("status", "==", "Completed"));
        const usersQuery = collection(db, "users");

        const [completedCount, totalUsersCount] = await Promise.all([
          getCountFromServer(completedQuery),
          getCountFromServer(usersQuery)
        ]);
        
        // ** تعديل: جلب المستندات المفتوحة لمعالجتها في المتصفح **
        const openQuery = query(workOrdersRef, where("status", "in", ["Pending", "In Progress", "Scheduled"]));
        const openSnapshot = await getDocs(openQuery);

        let inProgressCount = 0;
        let overdueCount = 0;
        const now_string = new Date().toISOString().slice(0, 10);

        openSnapshot.docs.forEach(doc => {
          const order = doc.data();
          if (order.status === "In Progress") {
            inProgressCount++;
          }
          if (order.dueDate && order.dueDate < now_string) {
            overdueCount++;
          }
        });
        
        setDashboardStats({
          openOrders: openSnapshot.size, // Total open orders is the size of the snapshot
          completedOrders: completedCount.data().count,
          inProgressOrders: inProgressCount,
          overdueOrders: overdueCount,
          totalUsers: totalUsersCount.data().count,
          isLoading: false,
        });

      } catch (error) {
        console.error("Error fetching optimized dashboard stats: ", error);
        setDashboardStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchOptimizedDashboardStats();
  }, []);

  // ... باقي المكون يبقى كما هو
  if (dashboardStats.isLoading) {
    return <p>Loading Dashboard...</p>;
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500">Overview of facility operations</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-200" onClick={() => navigate('/work-orders', { state: { filter: 'Open' } })}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Open Orders</CardTitle><FileText className="h-4 w-4 text-gray-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardStats.openOrders}</div><p className="text-xs text-gray-500">+{dashboardStats.inProgressOrders} In Progress</p></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-200" onClick={() => navigate('/work-orders', { state: { filter: 'Completed' } })}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed Orders</CardTitle><CheckCircle className="h-4 w-4 text-gray-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardStats.completedOrders}</div><p className="text-xs text-gray-500">total completed</p></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-200" onClick={() => navigate('/user-management')}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Users</CardTitle><Users className="h-4 w-4 text-gray-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardStats.totalUsers}</div><p className="text-xs text-gray-500">total users</p></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-200" onClick={() => navigate('/work-orders', { state: { filter: 'Overdue' } })}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Overdue Orders</CardTitle><AlertCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{dashboardStats.overdueOrders}</div><p className="text-xs text-gray-500">needs immediate attention</p></CardContent></Card>
      </div>
    </div>
  );
}