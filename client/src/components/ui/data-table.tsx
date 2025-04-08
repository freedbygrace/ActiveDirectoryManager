import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface DataTableColumn<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: {
    pageSize: number;
    pageIndex: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  onRowClick,
  searchable = false,
  filterable = false,
  pagination,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState("");

  // Simple filtering based on searchTerm matching any string property
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row => {
      return Object.entries(row as Record<string, any>).some(([key, value]) => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    });
  }, [data, searchTerm]);

  return (
    <div className="w-full">
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {filterable && (
            <Button variant="outline" className="sm:w-auto w-full">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, i) => (
                <TableHead key={i} className="bg-muted/50 font-medium">
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, i) => (
                <TableRow 
                  key={i} 
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                >
                  {columns.map((column, j) => (
                    <TableCell key={j}>
                      {column.cell
                        ? column.cell(row)
                        : typeof column.accessorKey === "function"
                        ? column.accessorKey(row)
                        : (row[column.accessorKey] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Rows per page:
            </p>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => pagination.onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pagination.pageSize} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Page {pagination.pageIndex + 1} of {pagination.pageCount}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(0)}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
                disabled={pagination.pageIndex === pagination.pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(pagination.pageCount - 1)}
                disabled={pagination.pageIndex === pagination.pageCount - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
