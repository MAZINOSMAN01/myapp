
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Package2, 
  Wrench, 
  AlertTriangle, 
  TrendingUp,
  Users,
  DollarSign,
  Calendar
} from "lucide-react";

export function Dashboard() {
  const metrics = [
    {
      title: "Total Facilities",
      value: "12",
      icon: Building2,
      change: "+2.1%",
      changeType: "positive" as const,
    },
    {
      title: "Active Assets",
      value: "1,847",
      icon: Package2,
      change: "+12.5%",
      changeType: "positive" as const,
    },
    {
      title: "Open Work Orders",
      value: "23",
      icon: Wrench,
      change: "-8.3%",
      changeType: "positive" as const,
    },
    {
      title: "Critical Alerts",
      value: "4",
      icon: AlertTriangle,
      change: "+2",
      changeType: "negative" as const,
    },
  ];

  const recentWorkOrders = [
    { id: "WO-2024-001", facility: "Building A", type: "HVAC", priority: "High", status: "In Progress" },
    { id: "WO-2024-002", facility: "Building B", type: "Electrical", priority: "Medium", status: "Pending" },
    { id: "WO-2024-003", facility: "Building C", type: "Plumbing", priority: "Low", status: "Completed" },
  ];

  const spaceUtilization = [
    { name: "Building A", utilized: 85, total: 100 },
    { name: "Building B", utilized: 72, total: 100 },
    { name: "Building C", utilized: 93, total: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome to your facility management overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <TrendingUp className={`h-3 w-3 ${metric.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}`} />
                <span className={metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {metric.change}
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Recent Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentWorkOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{order.id}</p>
                    <p className="text-sm text-gray-500">{order.facility} - {order.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={order.priority === 'High' ? 'destructive' : order.priority === 'Medium' ? 'default' : 'secondary'}
                    >
                      {order.priority}
                    </Badge>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Space Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Space Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {spaceUtilization.map((space) => (
                <div key={space.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">{space.name}</span>
                    <span className="text-gray-500">{space.utilized}%</span>
                  </div>
                  <Progress value={space.utilized} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
