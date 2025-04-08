import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ApiRequest {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  requests: number;
  success: number;
  avgTime: number;
}

// Sample data for display
const apiRequests: ApiRequest[] = [
  {
    endpoint: "/api/users",
    method: "GET",
    requests: 1456,
    success: 99.3,
    avgTime: 56,
  },
  {
    endpoint: "/api/groups",
    method: "GET",
    requests: 892,
    success: 100,
    avgTime: 43,
  },
  {
    endpoint: "/api/users",
    method: "POST",
    requests: 512,
    success: 97.8,
    avgTime: 87,
  },
  {
    endpoint: "/api/users/{id}",
    method: "PUT",
    requests: 342,
    success: 98.5,
    avgTime: 64,
  },
  {
    endpoint: "/api/computers",
    method: "GET",
    requests: 289,
    success: 100,
    avgTime: 38,
  },
];

const methodColors = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-amber-100 text-amber-800",
  DELETE: "bg-red-100 text-red-800",
};

export default function ApiActivityCard() {
  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle>API Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <div className="bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2" style={{ width: "75%" }}></div>
            </div>
          </div>
          <div className="text-sm font-medium">75%</div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2 font-medium text-left">Endpoint</th>
                <th className="pb-2 font-medium text-left">Method</th>
                <th className="pb-2 font-medium text-left">Requests</th>
                <th className="pb-2 font-medium text-left">Success</th>
                <th className="pb-2 font-medium text-left">Avg. Time</th>
              </tr>
            </thead>
            <tbody>
              {apiRequests.map((request, index) => (
                <tr key={index} className={index < apiRequests.length - 1 ? "border-b" : ""} style={{ height: "48px" }}>
                  <td>{request.endpoint}</td>
                  <td>
                    <Badge 
                      variant="outline" 
                      className={`${methodColors[request.method]} border-none`}
                    >
                      {request.method}
                    </Badge>
                  </td>
                  <td>{request.requests.toLocaleString()}</td>
                  <td>{request.success}%</td>
                  <td>{request.avgTime}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
