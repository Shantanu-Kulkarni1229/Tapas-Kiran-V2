import { useState } from "react";
import { 
  Users, 
  UserCheck, 
  Activity, 
  BarChart3, 
  MapPin, 
  Calendar, 
  Trophy, 
  Search,
  Menu,
  X,
  Shield,
  Home,
  ChevronRight
} from "lucide-react";
import AllUsers from "./pages/AllUsers";
import LoggedInUsers from "./Pages/LoggedInUsers";
import ActiveUsers from "./pages/ActiveUsers";
import UserOverview from "./pages/UserOverview";
import TopActiveUsers from "./pages/TopActiveUsers";

const menuItems = [
  { 
    id: "overview", 
    label: "Dashboard Overview", 
    component: <UserOverview />, 
    icon: <Home className="h-5 w-5" />,
    description: "Complete user statistics and insights"
  },
  { 
    id: "all", 
    label: "All Users", 
    component: <AllUsers />, 
    icon: <Users className="h-5 w-5" />,
    description: "View all registered users"
  },
  { 
    id: "loggedIn", 
    label: "Logged In Users", 
    component: <LoggedInUsers />, 
    icon: <UserCheck className="h-5 w-5" />,
    description: "Currently active sessions"
  },
  { 
    id: "active", 
    label: "Active Users", 
    component: <ActiveUsers />, 
    icon: <Activity className="h-5 w-5" />,
    description: "Recently active users"
  },
  { 
    id: "top", 
    label: "Top Active Users", 
    component: <TopActiveUsers />, 
    icon: <Trophy className="h-5 w-5" />,
    description: "Most engaged users"
  },
 
];

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeComponent = menuItems.find(item => item.id === activePage)?.component;
  const activeMenuItem = menuItems.find(item => item.id === activePage);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:relative lg:translate-x-0
        w-80 bg-white shadow-2xl z-30 h-full
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Panel</h2>
                <p className="text-blue-100 text-sm">Maharashtra Police</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-4 space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setSidebarOpen(false); // Close mobile sidebar after selection
                }}
                className={`
                  w-full text-left p-4 rounded-xl transition-all duration-200
                  flex items-center gap-4 group relative overflow-hidden
                  ${activePage === item.id
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105"
                    : "hover:bg-blue-50 text-gray-700 hover:text-blue-700 hover:shadow-md"
                  }
                `}
              >
                {/* Background Animation */}
                <div className={`
                  absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 
                  transition-transform duration-300 ease-out
                  ${activePage === item.id ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0'}
                `} />
                
                {/* Content */}
                <div className="relative z-10 flex items-center gap-4 flex-1">
                  <div className={`
                    p-2 rounded-lg transition-colors
                    ${activePage === item.id 
                      ? 'bg-white/20' 
                      : 'bg-blue-100 text-blue-600 group-hover:bg-white/20 group-hover:text-white'
                    }
                  `}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`
                      font-semibold text-sm transition-colors
                      ${activePage === item.id ? 'text-white' : 'text-gray-900 group-hover:text-white'}
                    `}>
                      {item.label}
                    </div>
                    <div className={`
                      text-xs mt-1 transition-colors
                      ${activePage === item.id ? 'text-blue-100' : 'text-gray-500 group-hover:text-blue-100'}
                    `}>
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight className={`
                    h-4 w-4 transition-all duration-200
                    ${activePage === item.id 
                      ? 'text-white opacity-100 transform translate-x-0' 
                      : 'text-gray-400 opacity-0 transform -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-white'
                    }
                  `} />
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">System Status: Online</span>
            </div>
            <p className="text-blue-600 text-xs mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              
              {activeMenuItem && (
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    {activeMenuItem.icon}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {activeMenuItem.label}
                    </h1>
                    <p className="text-gray-600 text-sm">
                      {activeMenuItem.description}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Time</p>
                <p className="font-semibold text-gray-900">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="w-px h-10 bg-gray-300" />
              <div className="text-right">
                <p className="text-sm text-gray-500">Today's Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {activeComponent}
          </div>
        </div>
      </div>
    </div>
  );
}