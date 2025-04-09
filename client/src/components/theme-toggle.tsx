import * as React from "react";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

// Fallback toggle without context dependency
export function ThemeToggle() {
  // Try/catch block to handle possible context errors
  try {
    return <ThemeToggleWithContext />;
  } catch (error) {
    console.error("Theme context error:", error);
    // Fallback rendering without context
    return (
      <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-md">
        <Sun className="h-5 w-5" />
        <span className="sr-only">Theme settings</span>
      </Button>
    );
  }
}

// Component that uses the theme context
function ThemeToggleWithContext() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const iconClassName = "h-5 w-5 transition-all duration-200";
  
  // Determine which icon to show in the button based on current theme
  const getButtonIcon = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' 
        ? <Moon className={iconClassName} /> 
        : <Sun className={iconClassName} />;
    } else if (theme === 'dark') {
      return <Moon className={iconClassName} />;
    } else {
      return <Sun className={iconClassName} />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-md transition-colors"
          title={`Current theme: ${theme} ${theme === 'system' ? `(${resolvedTheme})` : ''}`}
        >
          {getButtonIcon()}
          <span className="sr-only">Toggle theme</span>
          {theme === 'system' && (
            <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-primary" 
                  title="Using system preference"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          Theme
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="flex justify-between"
        >
          <div className="flex items-center">
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </div>
          {theme === "light" && <Check className="h-4 w-4 ml-1 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="flex justify-between"
        >
          <div className="flex items-center">
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <Check className="h-4 w-4 ml-1 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="flex justify-between"
        >
          <div className="flex items-center">
            <Laptop className="mr-2 h-4 w-4" />
            <span>System</span>
          </div>
          {theme === "system" && (
            <div className="flex items-center">
              {resolvedTheme === "dark" ? (
                <Moon className="h-3 w-3 mr-1 text-muted-foreground" />
              ) : (
                <Sun className="h-3 w-3 mr-1 text-muted-foreground" />
              )}
              <Check className="h-4 w-4 text-primary" />
            </div>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}