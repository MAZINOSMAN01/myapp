// src/components/MaintenancePage.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreventiveMaintenance } from './PreventiveMaintenance'; // This line is corrected
import { CorrectiveMaintenance } from './CorrectiveMaintenance'; // This line is also corrected

export function MaintenancePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Maintenance Management</h1>
      <Tabs defaultValue="preventive" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preventive">Preventive Maintenance (PM)</TabsTrigger>
          <TabsTrigger value="corrective">Corrective Maintenance (CM)</TabsTrigger>
        </TabsList>
        <TabsContent value="preventive" className="mt-6">
          <PreventiveMaintenance />
        </TabsContent>
        <TabsContent value="corrective" className="mt-6">
          <CorrectiveMaintenance />
        </TabsContent>
      </Tabs>
    </div>
  );
}