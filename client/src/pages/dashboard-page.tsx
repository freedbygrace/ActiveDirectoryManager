import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import StatsCard from "@/components/dashboard/stats-card";
import ApiActivityCard from "@/components/dashboard/api-activity-card";
import ApiTokensCard from "@/components/dashboard/api-tokens-card";
import LdapConnectionsCard from "@/components/dashboard/ldap-connections-card";
import ApiDocumentationCard from "@/components/dashboard/api-documentation-card";
import { 
  Users, 
  UserPlus, 
  FolderClosed, 
  Monitor 
} from "lucide-react";
import { LdapConnection, ApiToken } from "@shared/schema";

export default function DashboardPage() {
  const { data: connections = [] } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
  });
  
  const { data: tokens = [] } = useQuery<ApiToken[]>({
    queryKey: ["/api/tokens"],
  });

  return (
    <DashboardLayout 
      title="Dashboard" 
      description="Active Directory Management API Overview"
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={1284}
          icon={<Users className="h-5 w-5" />}
          iconBgColor="bg-blue-100"
          iconColor="text-primary"
          changeValue={4.75}
          changeType="increase"
          changePeriod="from last month"
        />
        
        <StatsCard
          title="Total Groups"
          value={87}
          icon={<UserPlus className="h-5 w-5" />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          changeValue={2.3}
          changeType="increase"
          changePeriod="from last month"
        />
        
        <StatsCard
          title="Organizational Units"
          value={32}
          icon={<FolderClosed className="h-5 w-5" />}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
          changeValue={0}
          changeType="nochange"
          changePeriod="from last month"
        />
        
        <StatsCard
          title="Total Computers"
          value={563}
          icon={<Monitor className="h-5 w-5" />}
          iconBgColor="bg-teal-100"
          iconColor="text-teal-600"
          changeValue={1.2}
          changeType="decrease"
          changePeriod="from last month"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Activity Card */}
        <div className="lg:col-span-2">
          <ApiActivityCard />
        </div>
        
        {/* Active API Tokens */}
        <div>
          <ApiTokensCard tokens={tokens} />
        </div>
      </div>
      
      {/* LDAP Connections */}
      <div className="mt-6">
        <LdapConnectionsCard connections={connections} />
      </div>
      
      {/* API Documentation Preview */}
      <div className="mt-6">
        <ApiDocumentationCard />
      </div>
    </DashboardLayout>
  );
}
