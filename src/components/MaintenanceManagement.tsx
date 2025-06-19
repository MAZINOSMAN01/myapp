
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Search, Plus, Camera, Calendar, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";

export function MaintenanceManagement() {
  const maintenanceTypes = [
    { name: "Preventive", count: 45, color: "bg-blue-100 text-blue-800" },
    { name: "Corrective", count: 12, color: "bg-red-100 text-red-800" },
    { name: "Predictive", count: 8, color: "bg-green-100 text-green-800" },
    { name: "Proactive", count: 15, color: "bg-purple-100 text-purple-800" }
  ];

  const maintenanceTasks = [
    {
      id: "MNT-001",
      type: "Preventive",
      equipment: "HVAC Unit #1",
      location: "Building A - Roof",
      priority: "Medium",
      status: "Scheduled",
      assignedTo: "John Smith",
      scheduledDate: "2024-01-20",
      materials: ["Air filters", "Lubricant", "Cleaning solution"],
      tools: ["Wrench set", "Multimeter", "Pressure gauge"],
      beforePhoto: null,
      afterPhoto: null,
      description: "Quarterly HVAC maintenance check"
    },
    {
      id: "MNT-002",
      type: "Corrective",
      equipment: "Elevator #2",
      location: "Building B - Main",
      priority: "High",
      status: "In Progress",
      assignedTo: "Mike Wilson",
      scheduledDate: "2024-01-18",
      materials: ["Cable lubricant", "Safety sensor"],
      tools: ["Specialized elevator tools", "Safety harness"],
      beforePhoto: "elevator_before.jpg",
      afterPhoto: null,
      description: "Fix elevator door sensor malfunction"
    },
    {
      id: "MNT-003",
      type: "Predictive",
      equipment: "Generator #1",
      location: "Building C - Basement",
      priority: "Low",
      status: "Completed",
      assignedTo: "Sarah Johnson",
      scheduledDate: "2024-01-15",
      materials: ["Engine oil", "Oil filter"],
      tools: ["Oil drain pan", "Socket wrench"],
      beforePhoto: "gen_before.jpg",
      afterPhoto: "gen_after.jpg",
      description: "Predictive maintenance based on runtime hours"
    }
  ];

  const toolsInventory = [
    { name: "Wrench Set", quantity: 15, available: 12, inUse: 3 },
    { name: "Multimeter", quantity: 8, available: 6, inUse: 2 },
    { name: "Pressure Gauge", quantity: 5, available: 4, inUse: 1 },
    { name: "Safety Harness", quantity: 10, available: 8, inUse: 2 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
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
          <p className="text-gray-500">Manage preventive, corrective, predictive & proactive maintenance</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Maintenance Task
        </Button>
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search maintenance tasks..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {maintenanceTasks.map((task) => (
              <div key={task.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{task.equipment}</h4>
                    <p className="text-sm text-gray-500">{task.id} • {task.location}</p>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    <Badge className="bg-indigo-100 text-indigo-800">
                      {task.type}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Assigned To</p>
                    <p className="text-sm">{task.assignedTo}</p>
                    <p className="text-xs text-gray-500">Due: {task.scheduledDate}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Materials</p>
                    <div className="flex flex-wrap gap-1">
                      {task.materials.map((material, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Tools</p>
                    <div className="flex flex-wrap gap-1">
                      {task.tools.map((tool, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Photos</p>
                    <div className="flex gap-2">
                      {task.beforePhoto && (
                        <Button variant="outline" size="sm">
                          <Camera className="h-3 w-3 mr-1" />
                          Before
                        </Button>
                      )}
                      {task.afterPhoto && (
                        <Button variant="outline" size="sm">
                          <Camera className="h-3 w-3 mr-1" />
                          After
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              {toolsInventory.map((tool, index) => (
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
            <CardTitle>Maintenance Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded">
                <Calendar className="h-5 w-5 text-yellow-600" />
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
