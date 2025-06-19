
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, Search, Plus, Edit, Clock, User, AlertCircle } from "lucide-react";

export function WorkOrders() {
  const workOrders = [
    {
      id: "WO-2024-001",
      title: "HVAC System Maintenance",
      facility: "Building A",
      floor: "Roof",
      type: "HVAC",
      priority: "High",
      status: "In Progress",
      assignedTo: "John Smith",
      created: "2024-01-15",
      dueDate: "2024-01-18",
      description: "Annual maintenance check for main HVAC unit"
    },
    {
      id: "WO-2024-002",
      title: "Electrical Panel Inspection",
      facility: "Building B",
      floor: "Basement",
      type: "Electrical",
      priority: "Medium",
      status: "Pending",
      assignedTo: "Sarah Johnson",
      created: "2024-01-16",
      dueDate: "2024-01-20",
      description: "Quarterly inspection of main electrical panel"
    },
    {
      id: "WO-2024-003", 
      title: "Plumbing Leak Repair",
      facility: "Building C",
      floor: "2nd Floor",
      type: "Plumbing",
      priority: "High",
      status: "Completed",
      assignedTo: "Mike Wilson",
      created: "2024-01-10",
      dueDate: "2024-01-12",
      description: "Fix water leak in conference room"
    },
    {
      id: "WO-2024-004",
      title: "Fire Safety System Test",
      facility: "Building A",
      floor: "All Floors",
      type: "Safety",
      priority: "Medium",
      status: "Scheduled",
      assignedTo: "Lisa Davis",
      created: "2024-01-17",
      dueDate: "2024-01-25",
      description: "Monthly fire safety system testing"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Scheduled":
        return "bg-purple-100 text-purple-800";
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
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500">Manage maintenance tasks and requests</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search work orders by ID, facility, or type..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">23</div>
              <p className="text-sm text-gray-500">Open Orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Order Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{order.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{order.id}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Facility:</span>
                  <span className="font-medium">{order.facility} - {order.floor}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{order.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Assigned to:</span>
                  <span className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {order.assignedTo}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600 mb-2">{order.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created: {order.created}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      Due: {order.dueDate}
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Order
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Work Order Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">23</div>
              <p className="text-sm text-gray-500">Open</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">187</div>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">12</div>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">8</div>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">3</div>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
