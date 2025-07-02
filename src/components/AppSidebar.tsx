// src/components/AppSidebar.tsx
import { 
  Building2, LayoutDashboard, Package2, Wrench, FileText, 
  MapPin, Sparkles, Settings, DollarSign, Users, LogOut, Ticket, ClipboardList, Lightbulb, Car
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

// --- Menu items are now grouped ---
const menuGroups = [
    {
        title: "Main",
        items: [
            { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
        ]
    },
    {
        title: "Operations",
        items: [
            { title: "Work Orders", icon: Wrench, id: "work-orders" },
            { title: "Maintenance", icon: Settings, id: "maintenance" },
            { title: "Cleaning Management", icon: Sparkles, id: "cleaning" },
        ]
    },
    {
        title: "Assets & Spaces",
        items: [
            // --- THIS IS THE MODIFIED LINE ---
            { title: "Asset Management", icon: Package2, id: "assets" },
            { title: "Space Management", icon: MapPin, id: "spaces" },
        ]
    },
    {
        title: "Quality & Safety",
        items: [
            { title: "MOTs", icon: Car, id: "mots" },
            { title: "Issue Log", icon: ClipboardList, id: "issue-log" },
            { title: "Lessons Learned", icon: Lightbulb, id: "lessons-learned" },
        ]
    },
    {
        title: "Finance",
        items: [
            { title: "Quotations & Invoicing", icon: DollarSign, id: "quotations" },
        ]
    },
    {
        title: "Administration",
        items: [
            { title: "User Management", icon: Users, id: "users" },
            { title: "Reports", icon: FileText, id: "reports" },
        ]
    }
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
  
  return (
    <Sidebar className="border-r border-gray-200 flex flex-col">
      <SidebarHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src="/ALSALAMAH LOGO.jpg" alt="Company Logo" className="h-10 w-10 rounded-md object-contain" /> 
          <div>
            <h1 className="text-lg font-bold text-gray-900">ALSALAMAH CO.</h1>
            <p className="text-sm text-gray-500">Facility Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <div className="py-4 space-y-4">
            {menuGroups.map((group) => {
                const filteredItems = group.items.filter(item => allowedSections.includes(item.id));
                
                if (filteredItems.length === 0) {
                    return null;
                }
                
                return (
                    <div key={group.title}>
                        <h2 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {group.title}
                        </h2>
                        <SidebarMenu className="mt-2">
                            {filteredItems.map((item) => (
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
                );
            })}
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