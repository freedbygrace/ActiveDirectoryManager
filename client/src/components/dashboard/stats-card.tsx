import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  changeValue: number;
  changeType: "increase" | "decrease" | "nochange";
  changePeriod: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  changeValue,
  changeType,
  changePeriod,
}: StatsCardProps) {
  return (
    <Card className="material-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-medium mt-1">{value.toLocaleString()}</p>
          </div>
          <div className={`w-12 h-12 rounded-full ${iconBgColor} flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
        </div>
        <div className="mt-4 text-sm flex items-center">
          {changeType === "increase" && (
            <>
              <ArrowUpIcon className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">{changeValue}% increase</span>
              <span className="ml-1 text-muted-foreground">{changePeriod}</span>
            </>
          )}
          {changeType === "decrease" && (
            <>
              <ArrowDownIcon className="h-3 w-3 mr-1 text-red-600" />
              <span className="text-red-600">{changeValue}% decrease</span>
              <span className="ml-1 text-muted-foreground">{changePeriod}</span>
            </>
          )}
          {changeType === "nochange" && (
            <>
              <span className="text-muted-foreground">No change</span>
              <span className="ml-1 text-muted-foreground">{changePeriod}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
