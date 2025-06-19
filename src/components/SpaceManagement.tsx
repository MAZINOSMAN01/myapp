
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Plus, Edit, Users } from "lucide-react";

export function SpaceManagement() {
  const spaces = [
    {
      id: "SP-001",
      name: "Conference Room A",
      building: "Building A",
      floor: "2nd Floor",
      capacity: 12,
      type: "Meeting Room",
      status: "Available",
      area: "240 sq ft"
    },
    {
      id: "SP-002",
      name: "Open Office Area",
      building: "Building A",
      floor: "1st Floor",
      capacity: 48,
      type: "Office Space",
      status: "Occupied",
      area: "1,200 sq ft"
    },
    {
      id: "SP-003",
      name: "Training Room B",
      building: "Building B",
      floor: "3rd Floor",
      capacity: 24,
      type: "Training Room",
      status: "Maintenance",
      area: "480 sq ft"
    },
    {
      id: "SP-004",
      name: "Cafeteria",
      building: "Building A",
      floor: "Ground Floor",
      capacity: 80,
      type: "Common Area",
      status: "Available",
      area: "800 sq ft"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Occupied":
        return "bg-blue-100 text-blue-800";
      case "Maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Space Management</h1>
          <p className="text-gray-500">Manage and track your facility spaces</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New Space
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search spaces by name, building, or type..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Space Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <Card key={space.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{space.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{space.building} - {space.floor}</p>
                </div>
                <Badge className={getStatusColor(space.status)}>
                  {space.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{space.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Capacity: {space.capacity} people</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span>Area: {space.area}</span>
                </div>
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Space
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Space Utilization Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Space Utilization Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">164</div>
              <p className="text-sm text-gray-500">Total Spaces</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">127</div>
              <p className="text-sm text-gray-500">Available</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">32</div>
              <p className="text-sm text-gray-500">Occupied</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">5</div>
              <p className="text-sm text-gray-500">Maintenance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
