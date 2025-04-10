import { DashboardConfig } from "@/components/dashboard/dashboard-layout";

// Interface for snapshot branding options
export interface SnapshotBranding {
  logoUrl: string;
  companyName: string;
  title: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  showDate: boolean;
  showFooter: boolean;
  footerText: string;
  expiresInDays: number;
}

// Interface for snapshot data
export interface SnapshotData {
  dashboard: DashboardConfig;
  dataSources: Array<{
    id: string;
    name: string;
    data: any[];
    fields: Array<{ name: string; type: string }>;
  }>;
  branding: SnapshotBranding;
  createdAt: string;
  expiresAt: string | null;
}

/**
 * Generate a snapshot of the dashboard data for sharing
 */
export function generateSnapshot({
  dashboard,
  dataSources,
  branding,
}: {
  dashboard: DashboardConfig;
  dataSources: Array<{
    id: string;
    name: string;
    data: any[];
    fields: Array<{ name: string; type: string }>;
  }>;
  branding: SnapshotBranding;
}): SnapshotData {
  const createdAt = new Date().toISOString();
  
  // Calculate expiry date if applicable
  let expiresAt: string | null = null;
  if (branding.expiresInDays > 0) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + branding.expiresInDays);
    expiresAt = expiry.toISOString();
  }
  
  const snapshotData: SnapshotData = {
    dashboard,
    dataSources,
    branding,
    createdAt,
    expiresAt,
  };
  
  return snapshotData;
}

/**
 * Checks if a snapshot has expired
 */
export function isSnapshotExpired(snapshot: SnapshotData): boolean {
  if (!snapshot.expiresAt) {
    return false; // No expiry date means it never expires
  }
  
  const expiryDate = new Date(snapshot.expiresAt);
  const now = new Date();
  
  return now > expiryDate;
}

/**
 * Format a date for display in the snapshot
 */
export function formatSnapshotDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}