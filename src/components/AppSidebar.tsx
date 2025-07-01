// src/components/AppSidebar.tsx

import { 
  Building2, LayoutDashboard, Package2, Wrench, FileText, 
  MapPin, Sparkles, Settings, DollarSign, Users, LogOut, Ticket, ClipboardList, Lightbulb 
} from "lucide-react";
import { 
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, 
  SidebarMenuButton, SidebarMenuItem 
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface AppSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { title: "Space Management", icon: MapPin, id: "spaces" },
  { title: "Asset Tracking", icon: Package2, id: "assets" },
  { title: "Work Orders", icon: Wrench, id: "work-orders" },
  { title: "Cleaning Management", icon: Sparkles, id: "cleaning" },
  { title: "Maintenance Management", icon: Settings, id: "maintenance" },
  { title: "Quotations & Invoicing", icon: DollarSign, id: "quotations" },
  { title: "Issue Log", icon: ClipboardList, id: "issue-log" },
  { title: "Lessons Learned", icon: Lightbulb, id: "lessons-learned" },
  { title: "MOTs", icon: Ticket, id: "mots" },
  { title: "User Management", icon: Users, id: "users" },
  { title: "Reports", icon: FileText, id: "reports" },
];

const rolePermissions: { [key: string]: string[] } = {
  'High Manager': [
    'dashboard', 'spaces', 'assets', 'work-orders', 'cleaning', 
    'maintenance', 'quotations', 'issue-log', 'lessons-learned', 'mots', 'users', 'reports'
  ],
  'Engineer': [
    'dashboard', 'work-orders', 'maintenance', 'assets', 'reports', 'issue-log', 'lessons-learned'
  ],
  'Technician': [
    'dashboard', 'work-orders', 'maintenance'
  ]
};

export function AppSidebar({ activeSection, setActiveSection }: AppSidebarProps) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const userRole = userProfile?.role || 'Technician'; 
  const allowedSections = rolePermissions[userRole] || [];
  const filteredMenuItems = menuItems.filter(item => 
    allowedSections.includes(item.id)
  );

  return (
    <Sidebar className="border-r border-gray-200 flex flex-col">
      {/* --- هذا هو الجزء الذي تم تعديله --- */}
      <SidebarHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* 1. تم وضع شعار شركتك هنا */}
          <img src="/ALSALAMAH LOGO.jpg" alt="Company Logo" className="h-10 w-10 rounded-md object-contain" /> 
          <div>
            {/* 2. تم تغيير الاسم إلى اسم الشركة */}
            <h1 className="text-lg font-bold text-gray-900">ALSALAMAH CO.</h1>
            <p className="text-sm text-gray-500">Facility Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <div className="py-4 space-y-4">
            <h2 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              NAVIGATION
            </h2>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveSection(item.id)}
                    isActive={activeSection === item.id}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
        </div>
      </SidebarContent>

      <div className="p-4 border-t border-gray-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="w-full text-red-500 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}