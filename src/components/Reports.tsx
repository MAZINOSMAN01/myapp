
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  Building2,
  Package2,
  Wrench
} from "lucide-react";

export function Reports() {
  const reportCategories = [
    {
      title: "Facility Reports",
      icon: Building2,
      reports: [
        { name: "Space Utilization Report", description: "Current space usage across all facilities", lastGenerated: "2024-01-15" },
        { name: "Occupancy Analysis", description: "Detailed occupancy trends and patterns", lastGenerated: "2024-01-14" },
        { name: "Energy Consumption", description: "Monthly energy usage by facility", lastGenerated: "2024-01-13" }
      ]
    },
    {
      title: "Asset Reports",
      icon: Package2,
      reports: [
        { name: "Asset Inventory", description: "Complete list of all tracked assets", lastGenerated: "2024-01-16" },
        { name: "Maintenance Schedule", description: "Upcoming maintenance tasks", lastGenerated: "2024-01-15" },
        { name: "Asset Depreciation", description: "Financial depreciation analysis", lastGenerated: "2024-01-10" }
      ]
    },
    {
      title: "Work Order Reports",
      icon: Wrench,
      reports: [
        { name: "Work Order Summary", description: "Overview of all work orders", lastGenerated: "2024-01-17" },
        { name: "Performance Metrics", description: "Completion times and efficiency", lastGenerated: "2024-01-16" },
        { name: "Cost Analysis", description: "Maintenance costs breakdown", lastGenerated: "2024-01-12" }
      ]
    }
  ];

  const quickStats = [
    {
      title: "Reports Generated",
      value: "342",
      change: "+18%",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Monthly Reports",
      value: "28",
      change: "+12%", 
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Custom Reports", 
      value: "15",
      change: "+5%",
      icon: BarChart3,
      color: "text-purple-600"
    },
    {
      title: "Scheduled Reports",
      value: "23",
      change: "+8%",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Generate and manage facility reports</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <FileText className="h-4 w-4 mr-2" />
          Create Custom Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-600">{stat.change}</span>
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {reportCategories.map((category) => (
          <Card key={category.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report) => (
                  <div key={report.name} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          Last: {report.lastGenerated}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Available
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <FileText className="h-3 w-3 mr-1" />
                          Generate
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Monthly Facility Summary", type: "Facility", generated: "2024-01-17", size: "2.4 MB", status: "Ready" },
              { name: "Asset Maintenance Report", type: "Asset", generated: "2024-01-16", size: "1.8 MB", status: "Ready" },
              { name: "Work Order Analysis", type: "Work Order", generated: "2024-01-15", size: "3.2 MB", status: "Ready" },
              { name: "Energy Usage Report", type: "Facility", generated: "2024-01-14", size: "1.5 MB", status: "Processing" }
            ].map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">{report.type} • {report.generated} • {report.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={report.status === "Ready" ? "default" : "secondary"}>
                    {report.status}
                  </Badge>
                  {report.status === "Ready" && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
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
