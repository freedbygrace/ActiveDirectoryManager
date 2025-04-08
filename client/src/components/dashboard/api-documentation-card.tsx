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
          onClick={() => window.open("/api/docs", "_blank")}
        >
          View Full Documentation
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
<pre className="text-xs whitespace-pre-wrap">
# Active Directory Management API

## User Endpoints

GET /api/users
- Query Parameters:
  - filter: Filter users by property values (e.g. ?filter=name eq 'John')
  - select: Select specific properties to return (e.g. ?select=id,name,email)
  - expand: Include related entities (e.g. ?expand=groups)
  - orderBy: Order results (e.g. ?orderBy=name asc)
  - top: Limit number of results (e.g. ?top=10)
  - skip: Skip number of results (e.g. ?skip=10)

POST /api/users
- Create a new user in Active Directory
- Request body: User object

GET /api/users/{id}
- Get a specific user by ID
- Query Parameters:
  - select: Select specific properties to return

PUT /api/users/{id}
- Update a specific user
- Request body: User object with updated properties

DELETE /api/users/{id}
- Delete a specific user
</pre>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="link" 
            className="p-0 h-auto font-medium text-sm text-primary"
            onClick={() => window.open("/api/docs", "_blank")}
          >
            Go to Swagger Documentation <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
