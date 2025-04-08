import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, BookOpen, Share2 } from "lucide-react";
import { Link } from "wouter";

export function ApiDocumentationCard() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
        <CardTitle className="text-xl flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> API Documentation
        </CardTitle>
        <CardDescription>
          Explore and download the OpenAPI specification
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Overview</h3>
            <p className="text-sm text-muted-foreground">
              The Active Directory Management API provides a comprehensive interface for managing users, groups, organizational units, computers, and domains in your Active Directory environment.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Documentation Links</h3>
            <div className="flex flex-col gap-2">
              <a 
                href="/api/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <BookOpen className="w-4 h-4" /> Interactive API Documentation
              </a>
              <a 
                href="/api/docs/more-info" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <FileJson className="w-4 h-4" /> Advanced Usage Guide
              </a>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <a href="/api/docs/download?format=json" download="ad-management-api-spec.json">
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-3 w-3" />
            JSON Spec
          </Button>
        </a>
        <a href="/api/docs/download?format=yaml" download="ad-management-api-spec.yaml">
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-3 w-3" />
            YAML Spec
          </Button>
        </a>
        <Button variant="outline" size="sm" className="h-8 ml-auto" asChild>
          <Link to="/api-tokens">
            <Share2 className="mr-2 h-3 w-3" />
            Manage API Tokens
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}