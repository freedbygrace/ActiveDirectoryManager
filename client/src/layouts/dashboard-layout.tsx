import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  LogOut,
  Menu,
  Bell,
  HelpCircle,
  User,
  Settings,
  Home,
  Users,
  UserPlus,
  FolderClosed,
  Monitor,
  Globe,
  Key,
  Server,
  ShieldAlert,
  Filter,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

type MenuItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type UserType = {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  role?: string;
};

const menuSections: MenuSection[] = [
  {
    title: "Active Directory",
    items: [
      { title: "Users", path: "/users", icon: <Users className="h-4 w-4" /> },
      { title: "Groups", path: "/groups", icon: <UserPlus className="h-4 w-4" /> },
      { title: "Organizational Units", path: "/organizational-units", icon: <FolderClosed className="h-4 w-4" /> },
      { title: "Computers", path: "/computers", icon: <Monitor className="h-4 w-4" /> },
      { title: "Domains", path: "/domains", icon: <Globe className="h-4 w-4" /> },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "API Tokens", path: "/api-tokens", icon: <Key className="h-4 w-4" /> },
      { title: "LDAP Connections", path: "/ldap-connections", icon: <Server className="h-4 w-4" /> },
      { title: "LDAP Query Builder", path: "/ldap-query-builder", icon: <Filter className="h-4 w-4" /> },
      { title: "Settings", path: "/settings", icon: <Settings className="h-4 w-4" /> },
      { title: "User Management", path: "/user-management", icon: <ShieldAlert className="h-4 w-4" /> },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [user, setUser] = useState<UserType | null>(null);
  const { toast } = useToast();

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
        navigate('/auth');
      } else {
        toast({
          title: "Logout failed",
          description: "An error occurred during logout.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Logout failed",
        description: "An error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "U";
    
    if (user.fullName) {
      const nameParts = user.fullName.split(" ");
      if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    return user.username[0].toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`w-64 h-full dark:bg-sidebar bg-white shadow-md z-10 flex-shrink-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "" : "-ml-64"
        } ${isMobile ? "absolute" : "relative"}`}
      >
        <div className="h-16 flex items-center px-4 border-b">
          <Link href="/" className="font-medium text-lg text-primary">
            AD Management API
          </Link>
        </div>

        <div className="overflow-y-auto h-[calc(100%-64px)]">
          <div className="px-2 pt-4">
            <Link 
              href="/"
              className={`drawer-item px-4 py-2 flex items-center space-x-3 rounded cursor-pointer ${
                location === "/" ? "active" : ""
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            {menuSections.map((section, idx) => (
              <div key={idx}>
                <div className="mt-6 mb-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </div>

                {section.items.map((item, itemIdx) => (
                  <Link 
                    href={item.path} 
                    key={itemIdx}
                    className={`drawer-item px-4 py-2 flex items-center space-x-3 rounded cursor-pointer ${
                      location === item.path ? "active" : ""
                    }`}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top App Bar */}
        <header className="h-16 bg-white dark:bg-sidebar shadow-sm flex items-center justify-between px-4 z-10">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>

            <Separator orientation="vertical" className="h-8" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm hidden md:inline-block">{user?.username}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-100">{title}</h1>
            {description && <p className="text-gray-600 dark:text-gray-400">{description}</p>}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
