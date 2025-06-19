
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search, Plus, Camera, FileText, Package, CheckCircle2 } from "lucide-react";

export function CleaningManagement() {
  const cleaningTasks = [
    {
      id: "CLN-001",
      area: "Main Lobby",
      task: "Daily Cleaning",
      status: "Completed",
      assignedTo: "Maria Rodriguez",
      materials: ["All-purpose cleaner", "Microfiber cloths", "Vacuum cleaner"],
      beforePhoto: "before_lobby.jpg",
      afterPhoto: "after_lobby.jpg",
      completedAt: "2024-01-17 08:30",
      sop: "SOP-001"
    },
    {
      id: "CLN-002", 
      area: "Conference Room A",
      task: "Deep Cleaning",
      status: "In Progress",
      assignedTo: "Carlos Santos",
      materials: ["Glass cleaner", "Disinfectant", "Paper towels"],
      beforePhoto: "before_conf_a.jpg",
      afterPhoto: null,
      completedAt: null,
      sop: "SOP-002"
    },
    {
      id: "CLN-003",
      area: "Restrooms - Floor 2",
      task: "Sanitization",
      status: "Scheduled",
      assignedTo: "Ana Silva",
      materials: ["Disinfectant spray", "Toilet paper", "Hand soap"],
      beforePhoto: null,
      afterPhoto: null,
      completedAt: null,
      sop: "SOP-003"
    }
  ];

  const materialInventory = [
    { name: "All-purpose cleaner", quantity: 45, unit: "bottles", minStock: 10 },
    { name: "Microfiber cloths", quantity: 120, unit: "pieces", minStock: 50 },
    { name: "Disinfectant spray", quantity: 8, unit: "bottles", minStock: 15 },
    { name: "Vacuum bags", quantity: 25, unit: "pieces", minStock: 10 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Scheduled":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cleaning Management</h1>
          <p className="text-gray-500">Manage cleaning tasks, materials, and SOPs</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Cleaning Task
        </Button>
      </div>

      {/* Search and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search cleaning tasks..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <p className="text-sm text-gray-500">Active Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">89%</div>
              <p className="text-sm text-gray-500">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cleaning Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Active Cleaning Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cleaningTasks.map((task) => (
              <div key={task.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{task.area} - {task.task}</h4>
                    <p className="text-sm text-gray-500">{task.id} • Assigned to: {task.assignedTo}</p>
                  </div>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Materials Required</p>
                    <div className="flex flex-wrap gap-1">
                      {task.materials.map((material, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {material}
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
                  
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">SOP</p>
                    <Button variant="outline" size="sm">
                      <FileText className="h-3 w-3 mr-1" />
                      {task.sop}
                    </Button>
                  </div>
                </div>
                
                {task.completedAt && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed: {task.completedAt}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Material Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cleaning Materials Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {materialInventory.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{item.name}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Current Stock:</span>
                    <span className="font-medium">{item.quantity} {item.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Min Stock:</span>
                    <span>{item.minStock} {item.unit}</span>
                  </div>
                  {item.quantity <= item.minStock && (
                    <Badge variant="destructive" className="text-xs">
                      Low Stock
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
