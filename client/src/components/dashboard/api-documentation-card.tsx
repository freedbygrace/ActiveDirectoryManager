import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function ApiDocumentationCard() {
  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
        <CardTitle>API Documentation</CardTitle>
        <Button 
          variant="link" 
          className="p-0 h-auto font-medium text-sm text-primary"
          onClick={() => window.open("/api-docs", "_blank")}
        >
          View Full Documentation
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
<div className="text-xs whitespace-pre-wrap">
<p className="font-bold mb-2"># Active Directory Management API</p>

<p className="font-bold mt-3 mb-2">## User Endpoints</p>

<p className="mb-1">GET /api/users</p>
<p className="mb-1">- Query Parameters:</p>
<p className="ml-4 mb-1">- filter: Filter users by property values (e.g. ?filter=name eq 'John')</p>
<p className="ml-4 mb-1">- select: Select specific properties to return (e.g. ?select=id,name,email)</p>
<p className="ml-4 mb-1">- expand: Include related entities (e.g. ?expand=groups)</p>
<p className="ml-4 mb-1">- orderBy: Order results (e.g. ?orderBy=name asc)</p>
<p className="ml-4 mb-1">- top: Limit number of results (e.g. ?top=10)</p>
<p className="ml-4 mb-1">- skip: Skip number of results (e.g. ?skip=10)</p>

<p className="mt-3 mb-1">POST /api/users</p>
<p className="mb-1">- Create a new user in Active Directory</p>
<p className="mb-1">- Request body: User object</p>

<p className="mt-3 mb-1">GET /api/users/{"{userId}"}</p>
<p className="mb-1">- Get a specific user by ID</p>
<p className="mb-1">- Query Parameters:</p>
<p className="ml-4 mb-1">- select: Select specific properties to return</p>

<p className="mt-3 mb-1">PUT /api/users/{"{userId}"}</p>
<p className="mb-1">- Update a specific user</p>
<p className="mb-1">- Request body: User object with updated properties</p>

<p className="mt-3 mb-1">DELETE /api/users/{"{userId}"}</p>
<p className="mb-1">- Delete a specific user</p>
</div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="link" 
            className="p-0 h-auto font-medium text-sm text-primary"
            onClick={() => window.open("/api-docs", "_blank")}
          >
            Go to Swagger Documentation <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
