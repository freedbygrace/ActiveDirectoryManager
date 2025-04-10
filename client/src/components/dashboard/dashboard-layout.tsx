import { useState, useEffect } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { DashboardWidget, WidgetProps } from "./dashboard-widget";
import { WidgetEditor, WidgetFormValues } from "./widget-editor";
import { Button } from "@/components/ui/button";
import { Plus, Save, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default layout configuration
const DEFAULT_LAYOUTS = {
  lg: [], // Large devices
  md: [], // Medium devices
  sm: [], // Small devices
  xs: [], // Extra small devices
  xxs: [], // Mobile devices
};

export interface DashboardConfig {
  id: string;
  name: string;
  layouts: any;
  widgets: WidgetProps[];
}

interface DashboardLayoutProps {
  config?: DashboardConfig;
  onSave?: (config: DashboardConfig) => void;
  isEditable?: boolean;
  dataSources: Array<{ id: string; name: string; data: any[]; fields: Array<{ name: string; type: string }> }>;
}

export function DashboardLayout({ 
  config, 
  onSave,
  isEditable = true,
  dataSources 
}: DashboardLayoutProps) {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState(config?.layouts || DEFAULT_LAYOUTS);
  const [widgets, setWidgets] = useState<WidgetProps[]>(config?.widgets || []);
  const [isWidgetEditorOpen, setIsWidgetEditorOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetFormValues | undefined>(undefined);
  const [dashboardName, setDashboardName] = useState(config?.name || "New Dashboard");
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; type: string }>>([]);
  
  // When data source changes, update available fields
  useEffect(() => {
    if (editingWidget?.dataSource) {
      const source = dataSources.find(s => s.id === editingWidget.dataSource);
      if (source) {
        setAvailableFields(source.fields);
      } else {
        setAvailableFields([]);
      }
    } else {
      setAvailableFields([]);
    }
  }, [editingWidget?.dataSource, dataSources]);

  // Handle layout changes (resizing, moving widgets)
  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  // Add a new widget
  const handleAddWidget = () => {
    setEditingWidget(undefined);
    setIsWidgetEditorOpen(true);
  };

  // Edit an existing widget
  const handleEditWidget = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      // Convert widget props to form values
      const formValues: WidgetFormValues = {
        id: widget.id,
        title: widget.title,
        type: widget.type,
        dataSource: widget.data[0]?.dataSource || "",
        config: {
          xAxis: widget.config.xAxis || "",
          yAxis: Array.isArray(widget.config.yAxis) 
            ? widget.config.yAxis.filter(Boolean) as string[] 
            : (widget.config.yAxis ? [widget.config.yAxis as string] : []),
          dimensions: (widget.config.dimensions || []).filter(Boolean) as string[],
          metrics: (widget.config.metrics || []).filter(Boolean) as string[],
          showLegend: widget.config.showLegend ?? true,
          stacked: widget.config.stacked ?? false,
          precision: widget.config.precision ?? 2,
          // Add new chart options with defaults
          colors: widget.config.colors || [],
          showGrid: widget.config.showGrid ?? true,
          showTooltip: widget.config.showTooltip ?? true,
          enableAnimation: widget.config.enableAnimation ?? true,
          valueFormatter: widget.config.valueFormatter ?? "none",
          currencySymbol: widget.config.currencySymbol ?? "$",
          minValue: widget.config.minValue ?? null,
          maxValue: widget.config.maxValue ?? null,
        },
      };
      
      setEditingWidget(formValues);
      setIsWidgetEditorOpen(true);
    }
  };

  // Delete a widget
  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    
    // Also remove from layouts
    Object.keys(layouts).forEach(breakpoint => {
      layouts[breakpoint] = layouts[breakpoint].filter((item: any) => item.i !== widgetId);
    });
    
    setLayouts({...layouts});
    
    toast({
      title: "Widget Deleted",
      description: "The widget has been removed from the dashboard.",
    });
  };

  // Save widget from editor
  const handleSaveWidget = (values: WidgetFormValues) => {
    const dataSource = dataSources.find(ds => ds.id === values.dataSource);
    if (!dataSource) {
      toast({
        title: "Error",
        description: "Selected data source not found.",
        variant: "destructive",
      });
      return;
    }
    
    const widgetId = values.id || `widget-${Date.now().toString(36)}`;
    
    // Create or update widget
    const newWidget: WidgetProps = {
      id: widgetId,
      title: values.title,
      type: values.type,
      data: dataSource.data,
      config: {
        xAxis: values.config.xAxis || "",
        yAxis: values.config.yAxis || [],
        dimensions: values.config.dimensions || [],
        metrics: values.config.metrics || [],
        showLegend: values.config.showLegend,
        stacked: values.config.stacked,
        precision: values.config.precision,
        colors: values.config.colors || ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'],
        // New chart options
        showGrid: values.config.showGrid,
        showTooltip: values.config.showTooltip,
        enableAnimation: values.config.enableAnimation,
        valueFormatter: values.config.valueFormatter,
        currencySymbol: values.config.currencySymbol,
        minValue: values.config.minValue,
        maxValue: values.config.maxValue,
      },
      onEdit: handleEditWidget,
      onDelete: handleDeleteWidget,
    };
    
    if (values.id) {
      // Update existing widget
      setWidgets(widgets.map(w => w.id === values.id ? newWidget : w));
      toast({
        title: "Widget Updated",
        description: "The widget has been updated successfully.",
      });
    } else {
      // Add new widget and position it on the layout
      setWidgets([...widgets, newWidget]);
      
      // Add to layout at the bottom
      const newItem = {
        i: widgetId,
        x: 0,
        y: Infinity, // This puts it at the bottom
        w: 6,        // Half width by default
        h: 4,        // Default height
        minW: 2,     // Minimum width
        minH: 2,     // Minimum height
      };
      
      Object.keys(layouts).forEach(breakpoint => {
        if (!layouts[breakpoint]) layouts[breakpoint] = [];
        layouts[breakpoint].push(newItem);
      });
      
      setLayouts({...layouts});
      
      toast({
        title: "Widget Added",
        description: "The new widget has been added to the dashboard.",
      });
    }
  };

  // Save the dashboard configuration
  const handleSaveDashboard = () => {
    if (onSave) {
      const dashboardConfig: DashboardConfig = {
        id: config?.id || `dashboard-${Date.now().toString(36)}`,
        name: dashboardName,
        layouts,
        widgets,
      };
      
      onSave(dashboardConfig);
      
      toast({
        title: "Dashboard Saved",
        description: "Your dashboard configuration has been saved.",
      });
    }
  };

  // Export dashboard configuration
  const handleExportDashboard = () => {
    const dashboardConfig: DashboardConfig = {
      id: config?.id || `dashboard-${Date.now().toString(36)}`,
      name: dashboardName,
      layouts,
      widgets,
    };
    
    const blob = new Blob([JSON.stringify(dashboardConfig, null, 2)], {
      type: "application/json",
    });
    
    saveAs(blob, `${dashboardName.replace(/\s+/g, '_')}_dashboard.json`);
    
    toast({
      title: "Dashboard Exported",
      description: "Your dashboard configuration has been exported as JSON.",
    });
  };

  // Import dashboard configuration
  const handleImportDashboard = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedConfig = JSON.parse(event.target?.result as string) as DashboardConfig;
            setDashboardName(importedConfig.name);
            setLayouts(importedConfig.layouts);
            setWidgets(importedConfig.widgets.map(w => ({
              ...w,
              onEdit: handleEditWidget,
              onDelete: handleDeleteWidget,
            })));
            
            toast({
              title: "Dashboard Imported",
              description: "The dashboard configuration has been imported successfully.",
            });
          } catch (error) {
            toast({
              title: "Import Error",
              description: "Failed to import dashboard configuration. Invalid file format.",
              variant: "destructive",
            });
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };

  return (
    <div className="dashboard-container">
      {isEditable && (
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 px-0"
          />
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportDashboard}
              className="flex items-center gap-1"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDashboard}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddWidget}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveDashboard}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              Save Dashboard
            </Button>
          </div>
        </div>
      )}
      
      {!isEditable && (
        <h2 className="text-2xl font-bold mb-4">{dashboardName}</h2>
      )}
      
      <div className="dashboard-grid">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={100}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditable}
          isResizable={isEditable}
          isBounded={true}
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <DashboardWidget
                id={widget.id}
                title={widget.title}
                type={widget.type}
                data={widget.data}
                config={widget.config}
                onEdit={isEditable ? handleEditWidget : () => {}}
                onDelete={isEditable ? handleDeleteWidget : () => {}}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
      
      {/* Widget Editor Dialog */}
      <WidgetEditor
        isOpen={isWidgetEditorOpen}
        onClose={() => setIsWidgetEditorOpen(false)}
        onSave={handleSaveWidget}
        editWidget={editingWidget}
        availableFields={availableFields}
        availableDataSources={dataSources.map(ds => ({ id: ds.id, name: ds.name }))}
      />
    </div>
  );
}