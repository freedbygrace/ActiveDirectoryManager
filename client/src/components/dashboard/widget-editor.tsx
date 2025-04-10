import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Plus } from "lucide-react";

const chartTypeOptions = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "area", label: "Area Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "table", label: "Table" },
  { value: "number", label: "Number (Sum)" },
];

const widgetSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["bar", "line", "area", "pie", "table", "number"]),
  dataSource: z.string().min(1, "Data source is required"),
  config: z.object({
    xAxis: z.string().optional(),
    yAxis: z.array(z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
    metrics: z.array(z.string()).optional(),
    showLegend: z.boolean().default(true),
    stacked: z.boolean().default(false),
    precision: z.number().min(0).max(10).default(2),
    // New chart options
    colors: z.array(z.string()).optional(),
    showGrid: z.boolean().default(true),
    showTooltip: z.boolean().default(true),
    enableAnimation: z.boolean().default(true),
    valueFormatter: z.enum(["none", "number", "percent", "currency"]).default("none"),
    currencySymbol: z.string().default("$"),
    minValue: z.number().nullable().default(null),
    maxValue: z.number().nullable().default(null),
  }),
});

export type WidgetFormValues = z.infer<typeof widgetSchema>;

interface WidgetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: WidgetFormValues) => void;
  editWidget?: WidgetFormValues;
  availableFields: Array<{ name: string; type: string }>;
  availableDataSources: Array<{ id: string; name: string }>;
}

export function WidgetEditor({ 
  isOpen, 
  onClose, 
  onSave, 
  editWidget, 
  availableFields,
  availableDataSources
}: WidgetEditorProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  const form = useForm<WidgetFormValues>({
    resolver: zodResolver(widgetSchema),
    defaultValues: {
      id: editWidget?.id || undefined,
      title: editWidget?.title || "",
      type: editWidget?.type || "table",
      dataSource: editWidget?.dataSource || "",
      config: {
        xAxis: editWidget?.config?.xAxis || "",
        yAxis: editWidget?.config?.yAxis || [],
        dimensions: editWidget?.config?.dimensions || [],
        metrics: editWidget?.config?.metrics || [],
        showLegend: editWidget?.config?.showLegend ?? true,
        stacked: editWidget?.config?.stacked ?? false,
        precision: editWidget?.config?.precision ?? 2,
        // New chart options with defaults
        colors: editWidget?.config?.colors || [],
        showGrid: editWidget?.config?.showGrid ?? true,
        showTooltip: editWidget?.config?.showTooltip ?? true,
        enableAnimation: editWidget?.config?.enableAnimation ?? true,
        valueFormatter: editWidget?.config?.valueFormatter || "none",
        currencySymbol: editWidget?.config?.currencySymbol || "$",
        minValue: editWidget?.config?.minValue ?? null,
        maxValue: editWidget?.config?.maxValue ?? null,
      },
    },
  });

  // Reset form when edit widget changes
  useEffect(() => {
    if (editWidget) {
      form.reset({
        id: editWidget.id,
        title: editWidget.title,
        type: editWidget.type,
        dataSource: editWidget.dataSource,
        config: {
          xAxis: editWidget.config.xAxis || "",
          yAxis: editWidget.config.yAxis || [],
          dimensions: editWidget.config.dimensions || [],
          metrics: editWidget.config.metrics || [],
          showLegend: editWidget.config.showLegend ?? true,
          stacked: editWidget.config.stacked ?? false,
          precision: editWidget.config.precision ?? 2,
        },
      });
      
      // Also update selected fields
      const fields = [
        ...(editWidget.config.dimensions || []),
        ...(editWidget.config.metrics || []),
      ];
      setSelectedFields(fields);
    } else {
      form.reset({
        id: undefined,
        title: "",
        type: "table",
        dataSource: "",
        config: {
          xAxis: "",
          yAxis: [],
          dimensions: [],
          metrics: [],
          showLegend: true,
          stacked: false,
          precision: 2,
        },
      });
      setSelectedFields([]);
    }
  }, [editWidget, form]);

  const watchType = form.watch("type");
  const watchDataSource = form.watch("dataSource");

  const handleSubmit = (values: WidgetFormValues) => {
    onSave(values);
    onClose();
  };

  const addField = (field: string) => {
    if (!selectedFields.includes(field)) {
      setSelectedFields([...selectedFields, field]);
      
      // Automatically categorize the field as dimension or metric based on its type
      const fieldInfo = availableFields.find(f => f.name === field);
      
      if (fieldInfo) {
        // Numbers and dates are typically metrics, other types are dimensions
        const isMetric = ['number', 'integer', 'float', 'date', 'datetime'].includes(fieldInfo.type.toLowerCase());
        
        if (isMetric) {
          const currentMetrics = form.getValues('config.metrics') || [];
          form.setValue('config.metrics', [...currentMetrics, field]);
        } else {
          const currentDimensions = form.getValues('config.dimensions') || [];
          form.setValue('config.dimensions', [...currentDimensions, field]);
          
          // If no X-axis is set and this is a dimension, use it as X-axis
          if (!form.getValues('config.xAxis')) {
            form.setValue('config.xAxis', field);
          }
        }
      }
    }
  };

  const removeField = (field: string) => {
    setSelectedFields(selectedFields.filter(f => f !== field));
    
    // Also remove from config
    const currentDimensions = form.getValues('config.dimensions') || [];
    const currentMetrics = form.getValues('config.metrics') || [];
    const currentYAxis = form.getValues('config.yAxis') || [];
    
    form.setValue('config.dimensions', currentDimensions.filter(d => d !== field));
    form.setValue('config.metrics', currentMetrics.filter(m => m !== field));
    form.setValue('config.yAxis', currentYAxis.filter(y => y !== field));
    
    // If this was the X-axis, clear it
    if (form.getValues('config.xAxis') === field) {
      form.setValue('config.xAxis', '');
    }
  };

  const isFieldDimension = (field: string) => {
    const dimensions = form.getValues('config.dimensions') || [];
    return dimensions.includes(field);
  };

  const toggleFieldType = (field: string) => {
    const dimensions = form.getValues('config.dimensions') || [];
    const metrics = form.getValues('config.metrics') || [];
    
    if (dimensions.includes(field)) {
      // Move from dimension to metric
      form.setValue('config.dimensions', dimensions.filter(d => d !== field));
      form.setValue('config.metrics', [...metrics, field]);
      
      // If this was the X-axis, clear it
      if (form.getValues('config.xAxis') === field) {
        form.setValue('config.xAxis', '');
      }
    } else if (metrics.includes(field)) {
      // Move from metric to dimension
      form.setValue('config.metrics', metrics.filter(m => m !== field));
      form.setValue('config.dimensions', [...dimensions, field]);
    }
  };

  const setAsXAxis = (field: string) => {
    form.setValue('config.xAxis', field);
  };

  const toggleAsYAxis = (field: string) => {
    const currentYAxis = form.getValues('config.yAxis') || [];
    
    if (currentYAxis.includes(field)) {
      form.setValue('config.yAxis', currentYAxis.filter(y => y !== field));
    } else {
      form.setValue('config.yAxis', [...currentYAxis, field]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{editWidget ? "Edit Widget" : "Add New Widget"}</DialogTitle>
          <DialogDescription>
            Configure your dashboard widget. Select data source, chart type, and fields to display.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Widget Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Widget Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chart Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select chart type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {chartTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dataSource"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Data Source</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select data source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableDataSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the data source for this widget
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {watchDataSource && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Available Fields</h3>
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                      {availableFields
                        .filter(field => !selectedFields.includes(field.name))
                        .map(field => (
                          <div 
                            key={field.name} 
                            className="flex justify-between items-center p-1 hover:bg-muted rounded cursor-pointer"
                            onClick={() => addField(field.name)}
                          >
                            <span className="text-sm">{field.name}</span>
                            <span className="text-xs text-muted-foreground">{field.type}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                addField(field.name);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Selected Fields</h3>
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                      {selectedFields.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-1">
                          No fields selected
                        </div>
                      ) : (
                        selectedFields.map(field => (
                          <div 
                            key={field} 
                            className="flex justify-between items-center p-1 hover:bg-muted rounded"
                          >
                            <span className="text-sm">{field}</span>
                            <div className="flex space-x-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleFieldType(field)}
                                className="h-6 text-xs"
                              >
                                {isFieldDimension(field) ? 'Dimension' : 'Metric'}
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeField(field)}
                                className="h-6 w-6"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                <Accordion type="single" collapsible defaultValue="chart-options">
                  <AccordionItem value="chart-options">
                    <AccordionTrigger>Chart Options</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {/* Data Configuration section */}
                        {["bar", "line", "area"].includes(watchType) && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium">Data Configuration</h3>
                            <div className="space-y-2 border-l-2 pl-3">
                              <FormField
                                control={form.control}
                                name="config.xAxis"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>X-Axis Field</FormLabel>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select X-Axis field" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {(form.getValues('config.dimensions') || []).map((dimension) => (
                                          <SelectItem key={dimension} value={dimension}>
                                            {dimension}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Choose a dimension field for the X-Axis
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div>
                                <FormLabel>Y-Axis Fields</FormLabel>
                                <div className="space-y-2 mt-2">
                                  {(form.getValues('config.metrics') || []).map((metric) => (
                                    <div key={metric} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={(form.getValues('config.yAxis') || []).includes(metric)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            toggleAsYAxis(metric);
                                          } else {
                                            toggleAsYAxis(metric);
                                          }
                                        }}
                                        id={`y-axis-${metric}`}
                                      />
                                      <label
                                        htmlFor={`y-axis-${metric}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {metric}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <FormDescription>
                                  Select metric fields to display on the Y-Axis
                                </FormDescription>
                              </div>
                              
                              <FormField
                                control={form.control}
                                name="config.stacked"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-sm">Stacked Chart</FormLabel>
                                      <FormDescription>
                                        Stack the values on top of each other
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Display Options section */}
                            <h3 className="text-sm font-medium">Display Options</h3>
                            <div className="space-y-4 border-l-2 pl-3">
                              {/* Show/Hide Grid Lines */}
                              <FormField
                                control={form.control}
                                name="config.showGrid"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-sm">Show Grid Lines</FormLabel>
                                      <FormDescription>
                                        Display grid lines in the chart background
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              {/* Show/Hide Tooltip */}
                              <FormField
                                control={form.control}
                                name="config.showTooltip"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-sm">Show Tooltip</FormLabel>
                                      <FormDescription>
                                        Display tooltip when hovering over data points
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              {/* Enable Animation */}
                              <FormField
                                control={form.control}
                                name="config.enableAnimation"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-sm">Enable Animation</FormLabel>
                                      <FormDescription>
                                        Animate chart when loading data
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              {/* Value Formatter */}
                              <FormField
                                control={form.control}
                                name="config.valueFormatter"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Value Format</FormLabel>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select value format" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="none">No formatting</SelectItem>
                                        <SelectItem value="number">Number with commas</SelectItem>
                                        <SelectItem value="percent">Percentage</SelectItem>
                                        <SelectItem value="currency">Currency</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Format for displaying values in the chart
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Currency Symbol (only if valueFormatter is 'currency') */}
                              {form.watch('config.valueFormatter') === 'currency' && (
                                <FormField
                                  control={form.control}
                                  name="config.currencySymbol"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Currency Symbol</FormLabel>
                                      <FormControl>
                                        <Input placeholder="$" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        Symbol to display before values (e.g., $, €, £)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>

                            {/* Axis Limits */}
                            <h3 className="text-sm font-medium">Axis Limits</h3>
                            <div className="grid grid-cols-2 gap-3 border-l-2 pl-3">
                              <FormField
                                control={form.control}
                                name="config.minValue"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Min Value</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Auto" 
                                        value={field.value !== null ? field.value : ''}
                                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Minimum value for Y-axis (optional)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="config.maxValue"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Value</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Auto" 
                                        value={field.value !== null ? field.value : ''}
                                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum value for Y-axis (optional)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                        
                        {watchType === "pie" && (
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="config.dimensions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Label Field</FormLabel>
                                  <Select
                                    value={field.value?.[0] || ""}
                                    onValueChange={(value) => {
                                      // For pie charts we only want one dimension
                                      field.onChange([value]);
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select label field" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {selectedFields.map((fieldName) => (
                                        <SelectItem key={fieldName} value={fieldName}>
                                          {fieldName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Choose a field for the pie chart labels
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="config.metrics"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Value Field</FormLabel>
                                  <Select
                                    value={field.value?.[0] || ""}
                                    onValueChange={(value) => {
                                      // For pie charts we only want one metric
                                      field.onChange([value]);
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select value field" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {selectedFields.map((fieldName) => (
                                        <SelectItem key={fieldName} value={fieldName}>
                                          {fieldName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Choose a field for the pie chart values
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {watchType === "number" && (
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="config.metrics"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Metric to Sum</FormLabel>
                                  <Select
                                    value={field.value?.[0] || ""}
                                    onValueChange={(value) => {
                                      // For number widgets we only want one metric
                                      field.onChange([value]);
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select metric to sum" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {selectedFields.map((fieldName) => (
                                        <SelectItem key={fieldName} value={fieldName}>
                                          {fieldName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Choose a field to sum
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="config.precision"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Decimal Precision: {field.value}</FormLabel>
                                  <FormControl>
                                    <Slider
                                      min={0}
                                      max={10}
                                      step={1}
                                      defaultValue={[field.value]}
                                      onValueChange={(values) => field.onChange(values[0])}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Number of decimal places to display
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        {["bar", "line", "area", "pie"].includes(watchType) && (
                          <FormField
                            control={form.control}
                            name="config.showLegend"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm">Show Legend</FormLabel>
                                  <FormDescription>
                                    Display a legend for the chart
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!watchDataSource}>
                {editWidget ? "Save Changes" : "Add Widget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}