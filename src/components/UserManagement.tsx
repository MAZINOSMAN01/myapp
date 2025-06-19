
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, Edit, Shield, User, Settings } from "lucide-react";

export function UserManagement() {
  const users = [
    {
      id: "USR-001",
      name: "John Manager",
      email: "john.manager@company.com",
      role: "High Manager",
      department: "Facility Management",
      status: "Active",
      permissions: ["View All", "Approve Quotations", "User Management", "Reports"]
    },
    {
      id: "USR-002",
      name: "Sarah Engineer",
      email: "sarah.engineer@company.com", 
      role: "Engineer",
      department: "Maintenance",
      status: "Active",
      permissions: ["Assign Work Orders", "View Tasks", "Material Requests"]
    },
    {
      id: "USR-003",
      name: "Mike Technician",
      email: "mike.tech@company.com",
      role: "Technician", 
      department: "Maintenance",
      status: "Active",
      permissions: ["Update Work Orders", "Upload Photos", "View Assigned Tasks"]
    },
    {
      id: "USR-004",
      name: "Lisa Accountant",
      email: "lisa.accounts@company.com",
      role: "Accountant",
      department: "Finance",
      status: "Active", 
      permissions: ["Approve Invoices", "View Financial Reports", "Manage Quotations"]
    },
    {
      id: "USR-005",
      name: "Maria Cleaner",
      email: "maria.cleaner@company.com",
      role: "Cleaning Staff",
      department: "Cleaning Services",
      status: "Active",
      permissions: ["Update Cleaning Tasks", "Upload Photos", "View SOPs"]
    }
  ];

  const roleDefinitions = [
    {
      role: "High Manager",
      description: "Full system access, can see all actions and reports",
      userCount: 2,
      color: "bg-purple-100 text-purple-800"
    },
    {
      role: "Engineer", 
      description: "Can assign work to technicians and manage maintenance",
      userCount: 5,
      color: "bg-blue-100 text-blue-800"
    },
    {
      role: "Technician",
      description: "Execute assigned work orders and update status with photos",
      userCount: 12,
      color: "bg-green-100 text-green-800"
    },
    {
      role: "Accountant",
      description: "Manage quotations, invoices, and financial approvals",
      userCount: 3,
      color: "bg-yellow-100 text-yellow-800"
    },
    {
      role: "Cleaning Staff",
      description: "Execute cleaning tasks and follow SOPs",
      userCount: 8,
      color: "bg-pink-100 text-pink-800"
    }
  ];

  const getRoleColor = (role: string) => {
    const roleData = roleDefinitions.find(r => r.role === role);
    return roleData ? roleData.color : "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-red-100 text-red-800";
      case "Suspended":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage users, roles, and permissions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {roleDefinitions.map((role) => (
          <Card key={role.role} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{role.userCount}</div>
                <Badge className={role.color}>{role.role}</Badge>
                <p className="text-xs text-gray-500 mt-2">{role.description}</p>
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
              placeholder="Search users by name, email, or role..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{user.name}</h4>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-sm text-gray-500">{user.department}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                    <Badge className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit User
                  </Button>
                  <Button variant="outline" size="sm">
                    <Shield className="h-3 w-3 mr-1" />
                    Permissions
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Permission</th>
                  <th className="text-center p-2">High Manager</th>
                  <th className="text-center p-2">Engineer</th>
                  <th className="text-center p-2">Technician</th>
                  <th className="text-center p-2">Accountant</th>
                  <th className="text-center p-2">Cleaning Staff</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "View All Data",
                  "Approve Quotations", 
                  "Assign Work Orders",
                  "Update Work Orders",
                  "Upload Photos",
                  "Manage Users",
                  "Financial Reports",
                  "View SOPs"
                ].map((permission, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{permission}</td>
                    <td className="text-center p-2">✅</td>
                    <td className="text-center p-2">{["Assign Work Orders", "View All Data"].includes(permission) ? "✅" : "❌"}</td>
                    <td className="text-center p-2">{["Update Work Orders", "Upload Photos"].includes(permission) ? "✅" : "❌"}</td>
                    <td className="text-center p-2">{["Approve Quotations", "Financial Reports"].includes(permission) ? "✅" : "❌"}</td>
                    <td className="text-center p-2">{["Upload Photos", "View SOPs"].includes(permission) ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
