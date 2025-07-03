// src/components/MaintenancePage.tsx
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PreventiveMaintenance } from './PreventiveMaintenance'
import { CorrectiveMaintenance } from './CorrectiveMaintenance'
import { MaintenanceCalendar } from './MaintenanceCalendar'

export function MaintenancePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Maintenance Management</h1>

      <Tabs defaultValue="preventive" className="w-full">
        {/* رؤوس التبويبات */}
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preventive">Preventive Maintenance (PM)</TabsTrigger>
          <TabsTrigger value="corrective">Corrective Maintenance (CM)</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* محتوى كل تبويب */}
        <TabsContent value="preventive" className="mt-6">
          <PreventiveMaintenance />
        </TabsContent>

        <TabsContent value="corrective" className="mt-6">
          <CorrectiveMaintenance />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <MaintenanceCalendar />
        </TabsContent>
      </Tabs>
    </div>
  )
}
