
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Settings, Search, Plus, Camera, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock, Wrench, FileText } from "lucide-react";
import { useState } from "react";

export function MaintenanceManagement() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const maintenanceTypes = [
    { name: "Preventive", count: 45, color: "bg-blue-100 text-blue-800" },
    { name: "Corrective", count: 12, color: "bg-red-100 text-red-800" },
    { name: "Predictive", count: 8, color: "bg-green-100 text-green-800" },
    { name: "Proactive", count: 15, color: "bg-purple-100 text-purple-800" }
  ];

  const preventiveTasks = [
    {
      id: "PM-001",
      equipment: "HVAC Unit #1",
      location: "Building A - Roof",
      frequency: "Monthly",
      nextDue: "2024-01-25",
      lastCompleted: "2023-12-25",
      status: "Due Soon",
      workOrder: "WO-2024-015"
    },
    {
      id: "PM-002", 
      equipment: "Generator #1",
      location: "Building C - Basement",
      frequency: "Quarterly",
      nextDue: "2024-02-15",
      lastCompleted: "2023-11-15",
      status: "Scheduled",
      workOrder: "WO-2024-016"
    },
    {
      id: "PM-003",
      equipment: "Fire Alarm System",
      location: "All Buildings",
      frequency: "Weekly",
      nextDue: "2024-01-22",
      lastCompleted: "2024-01-15",
      status: "Completed",
      workOrder: "WO-2024-014"
    }
  ];

  const correctiveTasks = [
    {
      id: "CM-001",
      equipment: "Elevator #2",
      location: "Building B - Main",
      issue: "Door sensor malfunction",
      priority: "High",
      status: "In Progress",
      workOrder: "WO-2024-017",
      reportedDate: "2024-01-18"
    },
    {
      id: "CM-002",
      equipment: "AC Unit #3",
      location: "Building A - Floor 2",
      issue: "Refrigerant leak",
      priority: "Medium",
      status: "Pending",
      workOrder: "WO-2024-018",
      reportedDate: "2024-01-19"
    }
  ];

  const predictiveTasks = [
    {
      id: "PD-001",
      equipment: "Pump #1",
      location: "Building C - Mechanical Room",
      condition: "Vibration levels elevated",
      recommendation: "Schedule bearing replacement",
      status: "Analysis Complete",
      workOrder: "WO-2024-019",
      analysisDate: "2024-01-16"
    }
  ];

  const proactiveTasks = [
    {
      id: "PR-001",
      equipment: "Lighting System",
      location: "Building A - All Floors",
      improvement: "LED retrofit project",
      expectedBenefit: "30% energy reduction",
      status: "Planning",
      workOrder: "WO-2024-020",
      proposedDate: "2024-02-01"
    }
  ];

  const preventiveSchedule = [
    { date: "2024-01-22", tasks: ["Fire Alarm Test", "Emergency Lighting Check"] },
    { date: "2024-01-25", tasks: ["HVAC Maintenance", "Filter Replacement"] },
    { date: "2024-01-29", tasks: ["Generator Test", "Fuel Level Check"] },
    { date: "2024-02-01", tasks: ["Elevator Inspection", "Safety Systems Check"] },
    { date: "2024-02-05", tasks: ["Water System Test", "Pressure Check"] }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Due Soon":
        return "bg-orange-100 text-orange-800";
      case "Scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-orange-100 text-orange-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-gray-500">Manage all maintenance types with integrated work orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Create Work Order
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Maintenance Task
          </Button>
        </div>
      </div>

      {/* Maintenance Type Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {maintenanceTypes.map((type) => (
          <Card key={type.name} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{type.count}</div>
                <Badge className={type.color}>{type.name}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Maintenance Types Tabs */}
      <Tabs defaultValue="preventive" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preventive">Preventive</TabsTrigger>
          <TabsTrigger value="corrective">Corrective</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="proactive">Proactive</TabsTrigger>
        </TabsList>

        <TabsContent value="preventive" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preventive Maintenance Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Preventive Maintenance Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Work Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preventiveTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.equipment}</p>
                            <p className="text-sm text-gray-500">{task.location}</p>
                          </div>
                        </TableCell>
                        <TableCell>{task.frequency}</TableCell>
                        <TableCell>{task.nextDue}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            {task.workOrder}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Preventive Maintenance Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Preventive Maintenance Timetable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                  <div className="space-y-2">
                    <h4 className="font-medium">Upcoming Tasks</h4>
                    {preventiveSchedule.map((schedule, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                        <p className="font-medium text-sm">{schedule.date}</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                          {schedule.tasks.map((task, taskIndex) => (
                            <li key={taskIndex}>{task}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="corrective" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Corrective Maintenance Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correctiveTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.equipment}</p>
                          <p className="text-sm text-gray-500">{task.location}</p>
                        </div>
                      </TableCell>
                      <TableCell>{task.issue}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          {task.workOrder}
                        </Button>
                      </TableCell>
                      <TableCell>{task.reportedDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Maintenance Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Work Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictiveTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.equipment}</p>
                          <p className="text-sm text-gray-500">{task.location}</p>
                        </div>
                      </TableCell>
                      <TableCell>{task.condition}</TableCell>
                      <TableCell>{task.recommendation}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          {task.workOrder}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proactive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proactive Maintenance Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Improvement</TableHead>
                    <TableHead>Expected Benefit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Work Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proactiveTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.equipment}</p>
                          <p className="text-sm text-gray-500">{task.location}</p>
                        </div>
                      </TableCell>
                      <TableCell>{task.improvement}</TableCell>
                      <TableCell>{task.expectedBenefit}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          {task.workOrder}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tools & Materials Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Tools Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Wrench Set", quantity: 15, available: 12, inUse: 3 },
                { name: "Multimeter", quantity: 8, available: 6, inUse: 2 },
                { name: "Pressure Gauge", quantity: 5, available: 4, inUse: 1 },
                { name: "Safety Harness", quantity: 10, available: 8, inUse: 2 }
              ].map((tool, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <h4 className="font-medium">{tool.name}</h4>
                    <p className="text-sm text-gray-500">Total: {tool.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Available: <span className="font-medium text-green-600">{tool.available}</span></p>
                    <p className="text-sm">In Use: <span className="font-medium text-blue-600">{tool.inUse}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded">
                <CalendarIcon className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Today's Tasks</p>
                  <p className="text-sm text-gray-600">3 preventive, 1 corrective</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">This Week</p>
                  <p className="text-sm text-gray-600">12 scheduled tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Overdue</p>
                  <p className="text-sm text-gray-600">2 tasks need attention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
