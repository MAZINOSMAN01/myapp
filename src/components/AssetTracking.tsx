
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package2, Search, Plus, Edit, Calendar, AlertCircle } from "lucide-react";

export function AssetTracking() {
  const assets = [
    {
      id: "AST-001",
      name: "HVAC Unit - Main",
      category: "HVAC System",
      location: "Building A - Roof",
      status: "Operational",
      condition: "Good",
      lastMaintenance: "2024-01-15",
      nextMaintenance: "2024-04-15",
      value: "$15,000"
    },
    {
      id: "AST-002",
      name: "Elevator System",
      category: "Transportation",
      location: "Building A - Lobby",
      status: "Operational",
      condition: "Excellent",
      lastMaintenance: "2024-02-01",
      nextMaintenance: "2024-05-01",
      value: "$85,000"
    },
    {
      id: "AST-003",
      name: "Emergency Generator",
      category: "Power Systems",
      location: "Building B - Basement",
      status: "Maintenance Required",
      condition: "Fair",
      lastMaintenance: "2023-12-10",
      nextMaintenance: "2024-03-10",
      value: "$25,000"
    },
    {
      id: "AST-004",
      name: "Fire Safety System",
      category: "Safety Equipment",
      location: "Building A - All Floors",
      status: "Operational",
      condition: "Good",
      lastMaintenance: "2024-01-20",
      nextMaintenance: "2024-07-20",
      value: "$12,000"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Operational":
        return "bg-green-100 text-green-800";
      case "Maintenance Required":
        return "bg-yellow-100 text-yellow-800";
      case "Out of Service":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Excellent":
        return "text-green-600";
      case "Good":
        return "text-blue-600";
      case "Fair":
        return "text-yellow-600";
      case "Poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Tracking</h1>
          <p className="text-gray-500">Monitor and manage your facility assets</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New Asset
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
                  placeholder="Search assets by name, category, or location..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">1,847</div>
              <p className="text-sm text-gray-500">Total Assets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assets.map((asset) => (
          <Card key={asset.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{asset.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{asset.category}</p>
                </div>
                <Badge className={getStatusColor(asset.status)}>
                  {asset.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{asset.location}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Condition:</span>
                  <span className={`font-medium ${getConditionColor(asset.condition)}`}>
                    {asset.condition}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Value:</span>
                  <span className="font-medium">{asset.value}</span>
                </div>
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Last: {asset.lastMaintenance}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-orange-600">Next: {asset.nextMaintenance}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Asset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Categories Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">45</div>
              <p className="text-sm text-gray-500">HVAC Systems</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">23</div>
              <p className="text-sm text-gray-500">Safety Equipment</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">18</div>
              <p className="text-sm text-gray-500">Power Systems</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">12</div>
              <p className="text-sm text-gray-500">Transportation</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">8</div>
              <p className="text-sm text-gray-500">Security Systems</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
