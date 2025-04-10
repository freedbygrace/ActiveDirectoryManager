import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Maximize2, Download } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { exportToExcel, exportToPDF, exportToCSV } from "../../lib/export-utils";

// Type for dataKey to work around TypeScript restrictions
type DataKeyType = string | number | ((obj: any) => any);

export interface DataPoint {
  [key: string]: any;
}

export interface WidgetProps {
  id: string;
  title: string;
  type: "bar" | "line" | "pie" | "area" | "table" | "number";
  data: DataPoint[];
  config: {
    xAxis?: string;
    yAxis?: string | string[];
    dimensions?: string[];
    metrics?: string[];
    colors?: string[];
    showLegend?: boolean;
    stacked?: boolean;
    precision?: number;
    // New chart options
    showGrid?: boolean;
    showTooltip?: boolean;
    enableAnimation?: boolean;
    valueFormatter?: "none" | "number" | "percent" | "currency";
    currencySymbol?: string;
    minValue?: number | null;
    maxValue?: number | null;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", 
  "#00C49F", "#FFBB28", "#FF8042", "#a4de6c", "#d0ed57"
];

export function DashboardWidget({ id, title, type, data, config, onEdit, onDelete }: WidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Format data for number type
  const calculateNumber = () => {
    if (!data || data.length === 0 || !config.metrics || config.metrics.length === 0) return 0;
    
    const metric = config.metrics[0];
    let value = 0;
    
    // Sum all values for the metric
    data.forEach(item => {
      if (item[metric] !== undefined && !isNaN(Number(item[metric]))) {
        value += Number(item[metric]);
      }
    });
    
    // Apply precision if specified
    if (config.precision !== undefined) {
      return value.toFixed(config.precision);
    }
    
    return value;
  };

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    switch (format) {
      case 'excel':
        exportToExcel(data, title);
        break;
      case 'pdf':
        exportToPDF(data, title, config);
        break;
      case 'csv':
        exportToCSV(data, title);
        break;
    }
  };

  // Render a table
  const renderTable = () => {
    if (!data || data.length === 0) return <p className="text-muted-foreground text-center py-4">No data available</p>;
    
    // Determine columns from first data point and config
    const columns = Object.keys(data[0])
      .filter(key => {
        if (config.dimensions && config.metrics) {
          return [...config.dimensions, ...config.metrics].includes(key);
        }
        return true;
      });
    
    return (
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column} 
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {data.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-background" : "bg-card"}>
                {columns.map((column) => (
                  <td key={column} className="px-3 py-2 text-sm">
                    {item[column] !== undefined ? String(item[column]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render different chart types
  const renderChart = () => {
    if (!data || data.length === 0) return <p className="text-muted-foreground text-center py-4">No data available</p>;
    
    const { 
      xAxis, 
      yAxis, 
      dimensions, 
      metrics, 
      colors = COLORS, 
      showLegend = true, 
      stacked = false,
      // New chart options with defaults
      showGrid = true,
      showTooltip = true,
      enableAnimation = true,
      valueFormatter = "none",
      currencySymbol = "$",
      minValue = null,
      maxValue = null
    } = config;
    
    const xAxisKey = xAxis as string;
    
    // Format values based on valueFormatter setting
    const formatValue = (value: any, index?: number): string => {
      const numValue = Number(value);
      
      if (valueFormatter === "none" || isNaN(numValue)) return String(value);
      
      if (valueFormatter === "number") {
        return numValue.toLocaleString();
      }
      
      if (valueFormatter === "percent") {
        return `${(numValue * 100).toFixed(config.precision || 0)}%`;
      }
      
      if (valueFormatter === "currency") {
        return `${currencySymbol}${numValue.toLocaleString(undefined, {
          minimumFractionDigits: config.precision || 0,
          maximumFractionDigits: config.precision || 0
        })}`;
      }
      
      return String(value);
    };
    
    // Custom tooltip formatter
    const customTooltipFormatter = (value: number, name: string) => {
      return [formatValue(value), name];
    };

    // TypeScript-compatible tickFormatter for YAxis
    const yAxisTickFormatter = (value: any) => {
      return valueFormatter !== "none" ? String(formatValue(value)) : String(value);
    };
    
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis 
                domain={[
                  minValue !== null ? minValue : 'auto', 
                  maxValue !== null ? maxValue : 'auto'
                ]} 
                tickFormatter={valueFormatter !== "none" ? yAxisTickFormatter : undefined}
              />
              {showTooltip && <Tooltip formatter={customTooltipFormatter} />}
              {showLegend && <Legend />}
              {Array.isArray(yAxis) && yAxis.length > 0
                ? yAxis.map((axis, index) => (
                    <Bar 
                      key={axis} 
                      dataKey={axis as string} 
                      stackId={stacked ? "a" : undefined} 
                      fill={colors[index % colors.length]}
                      isAnimationActive={enableAnimation}
                    />
                  ))
                : yAxis ? <Bar 
                    dataKey={yAxis as string} 
                    fill={colors[0]} 
                    isAnimationActive={enableAnimation}
                  /> : null
              }
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis 
                domain={[
                  minValue !== null ? minValue : 'auto', 
                  maxValue !== null ? maxValue : 'auto'
                ]} 
                tickFormatter={valueFormatter !== "none" ? yAxisTickFormatter : undefined}
              />
              {showTooltip && <Tooltip formatter={customTooltipFormatter} />}
              {showLegend && <Legend />}
              {Array.isArray(yAxis) && yAxis.length > 0
                ? yAxis.map((axis, index) => (
                    <Line 
                      key={axis} 
                      type="monotone" 
                      dataKey={axis as string} 
                      stroke={colors[index % colors.length]}
                      activeDot={{ r: 8 }}
                      isAnimationActive={enableAnimation}
                    />
                  ))
                : yAxis ? <Line 
                    type="monotone" 
                    dataKey={yAxis as string} 
                    stroke={colors[0]} 
                    activeDot={{ r: 8 }} 
                    isAnimationActive={enableAnimation}
                  /> : null
              }
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis 
                domain={[
                  minValue !== null ? minValue : 'auto', 
                  maxValue !== null ? maxValue : 'auto'
                ]} 
                tickFormatter={valueFormatter !== "none" ? yAxisTickFormatter : undefined}
              />
              {showTooltip && <Tooltip formatter={customTooltipFormatter} />}
              {showLegend && <Legend />}
              {Array.isArray(yAxis) && yAxis.length > 0
                ? yAxis.map((axis, index) => (
                    <Area 
                      key={axis} 
                      type="monotone" 
                      dataKey={axis as string} 
                      stackId={stacked ? "a" : `${index}`}
                      fill={colors[index % colors.length]}
                      stroke={colors[index % colors.length]}
                      isAnimationActive={enableAnimation}
                    />
                  ))
                : yAxis ? <Area 
                    type="monotone" 
                    dataKey={yAxis as string} 
                    fill={colors[0]} 
                    stroke={colors[0]} 
                    isAnimationActive={enableAnimation}
                  /> : null
              }
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        // For pie charts, we need to process the data differently
        const pieData = data.map(item => {
          const dimensionField = dimensions?.[0] || xAxis || "name";
          const metricField = Array.isArray(metrics) && metrics.length > 0 ? metrics[0] : 
                            (Array.isArray(yAxis) && yAxis.length > 0 ? yAxis[0] : 
                            (typeof yAxis === 'string' ? yAxis : "value"));
                            
          const name = item[dimensionField as string];
          const value = item[metricField as string];
          return { name, value: Number(value) };
        }).filter(item => !isNaN(item.value));
        
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                isAnimationActive={enableAnimation}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {showTooltip && <Tooltip 
                formatter={(value) => [formatValue(Number(value)), ""]} 
              />}
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'number':
        const rawValue = calculateNumber();
        let displayValue = rawValue;
        
        // Format value based on valueFormatter
        if (valueFormatter === "number") {
          displayValue = Number(rawValue).toLocaleString(undefined, {
            minimumFractionDigits: config.precision || 0,
            maximumFractionDigits: config.precision || 0
          });
        } else if (valueFormatter === "percent") {
          displayValue = `${(Number(rawValue) * 100).toFixed(config.precision || 0)}%`;
        } else if (valueFormatter === "currency") {
          displayValue = `${currencySymbol}${Number(rawValue).toLocaleString(undefined, {
            minimumFractionDigits: config.precision || 0,
            maximumFractionDigits: config.precision || 0
          })}`;
        }
        
        return (
          <div className="flex justify-center items-center h-[300px]">
            <div className="text-center">
              <h3 className="text-5xl font-bold">{displayValue}</h3>
              {config.metrics && config.metrics.length > 0 && (
                <p className="text-muted-foreground mt-4">{config.metrics[0]}</p>
              )}
            </div>
          </div>
        );
        
      case 'table':
      default:
        return renderTable();
    }
  };

  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${expanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExport('excel')}
            title="Export to Excel"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Minimize" : "Maximize"}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(id)}
            title="Edit Widget"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
            title="Delete Widget"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent ref={contentRef}>
        {renderChart()}
      </CardContent>
    </Card>
  );
}