import { SQL, and, asc, desc, eq, gt, gte, ilike, lt, lte, or, sql } from "drizzle-orm";
import { PgTableWithColumns } from "drizzle-orm/pg-core";
import debugLib from 'debug';

const debug = debugLib('api:query-parser');

export type FilterOperator = 
  | 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' 
  | 'in' | 'nin' | 'contains' | 'containsi' | 'startswith' | 'endswith';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface QueryOptions {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: string | number;
  skip?: string | number;
}

/**
 * Parse the filter query string into an array of filter conditions
 * Format examples:
 * - "name eq 'John'"
 * - "age gt 30 and (city eq 'New York' or city eq 'Boston')"
 * - "title contains 'Manager' and department eq 'IT' and createdAt gt '2023-01-01'"
 */
export function parseFilter(filterStr?: string): FilterCondition[] {
  if (!filterStr) return [];
  
  debug(`Parsing filter: ${filterStr}`);
  
  // Very basic parser for demonstration
  // Would need a proper parser for complex expressions with nested parentheses
  
  const conditions: FilterCondition[] = [];
  
  // Handle multiple conditions with 'and'
  const andParts = filterStr.split(' and ');
  
  andParts.forEach(part => {
    // Handle 'or' conditions (very simplistic, doesn't handle nested parentheses properly)
    if (part.includes(' or ')) {
      const orParts = part.replace(/[()]/g, '').split(' or ');
      orParts.forEach(orPart => {
        const condition = parseFilterExpression(orPart.trim());
        if (condition) conditions.push(condition);
      });
    } else {
      const condition = parseFilterExpression(part.trim());
      if (condition) conditions.push(condition);
    }
  });
  
  debug(`Parsed ${conditions.length} filter conditions`);
  return conditions;
}

/**
 * Parse a single filter expression like "name eq 'John'" or "age gt 30"
 */
function parseFilterExpression(expr: string): FilterCondition | null {
  // Match pattern: field operator value
  // Where value can be a quoted string, number, boolean, or null
  const regex = /^(\w+)\s+(eq|ne|gt|ge|lt|le|in|nin|contains|containsi|startswith|endswith)\s+(.+)$/;
  const match = expr.match(regex);
  
  if (!match) {
    debug(`Invalid filter expression: ${expr}`);
    return null;
  }
  
  const [, field, operator, rawValue] = match;
  
  // Parse the value based on type
  let value: any;
  
  if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
    // String value
    value = rawValue.slice(1, -1);
  } else if (rawValue.toLowerCase() === 'true') {
    value = true;
  } else if (rawValue.toLowerCase() === 'false') {
    value = false;
  } else if (rawValue.toLowerCase() === 'null') {
    value = null;
  } else if (/^\d+$/.test(rawValue)) {
    // Integer
    value = parseInt(rawValue, 10);
  } else if (/^\d+\.\d+$/.test(rawValue)) {
    // Float
    value = parseFloat(rawValue);
  } else {
    // Fallback to string
    value = rawValue;
  }
  
  return {
    field,
    operator: operator as FilterOperator,
    value
  };
}

/**
 * Convert filter conditions to SQL conditions
 */
export function applyFilterConditions<T extends PgTableWithColumns<any>>(
  table: T,
  conditions: FilterCondition[]
): SQL<unknown> | undefined {
  if (conditions.length === 0) return undefined;
  
  const sqlConditions = conditions.map(condition => {
    const { field, operator, value } = condition;
    
    if (!table[field as keyof typeof table]) {
      debug(`Field not found in table: ${field}`);
      return undefined;
    }
    
    const column = table[field as keyof typeof table];
    
    switch (operator) {
      case 'eq':
        return eq(column, value);
      case 'ne':
        return sql`${column} <> ${value}`;
      case 'gt':
        return gt(column, value);
      case 'ge':
        return gte(column, value);
      case 'lt':
        return lt(column, value);
      case 'le':
        return lte(column, value);
      case 'contains':
        return sql`${column} LIKE ${'%' + value + '%'}`;
      case 'containsi':
        return ilike(column, `%${value}%`);
      case 'startswith':
        return sql`${column} LIKE ${value + '%'}`;
      case 'endswith':
        return sql`${column} LIKE ${'%' + value}`;
      case 'in':
        // Expecting value to be comma-separated values
        const inValues = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
        return sql`${column} IN ${inValues}`;
      case 'nin':
        const ninValues = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
        return sql`${column} NOT IN ${ninValues}`;
      default:
        debug(`Unsupported operator: ${operator}`);
        return undefined;
    }
  }).filter(Boolean);
  
  if (sqlConditions.length === 0) return undefined;
  
  return and(...sqlConditions as SQL<unknown>[]);
}

/**
 * Parse the select query parameter to get the fields to include
 */
export function parseSelect(selectStr?: string): string[] {
  if (!selectStr) return [];
  
  const fields = selectStr.split(',').map(f => f.trim()).filter(Boolean);
  debug(`Selected fields: ${fields.join(', ')}`);
  return fields;
}

/**
 * Parse the expand query parameter to get the relations to include
 */
export function parseExpand(expandStr?: string): string[] {
  if (!expandStr) return [];
  
  const relations = expandStr.split(',').map(r => r.trim()).filter(Boolean);
  debug(`Expanded relations: ${relations.join(', ')}`);
  return relations;
}

/**
 * Parse the orderBy query parameter
 * Format: "field asc" or "field desc" or just "field" (defaults to asc)
 */
export function parseOrderBy<T extends PgTableWithColumns<any>>(
  table: T,
  orderByStr?: string
): SQL<unknown>[] {
  if (!orderByStr) return [];
  
  const parts = orderByStr.split(',').map(p => p.trim()).filter(Boolean);
  const orders: SQL<unknown>[] = [];
  
  for (const part of parts) {
    const [field, direction = 'asc'] = part.split(' ').map(p => p.trim());
    
    if (!table[field as keyof typeof table]) {
      debug(`Field not found for ordering: ${field}`);
      continue;
    }
    
    const column = table[field as keyof typeof table];
    
    if (direction.toLowerCase() === 'desc') {
      orders.push(desc(column));
    } else {
      orders.push(asc(column));
    }
  }
  
  debug(`Order by: ${orderByStr} -> ${orders.length} clauses`);
  return orders;
}

/**
 * Parse pagination parameters
 */
export function parsePagination(top?: string | number, skip?: string | number): { limit?: number, offset?: number } {
  const limit = top !== undefined ? parseInt(String(top), 10) : undefined;
  const offset = skip !== undefined ? parseInt(String(skip), 10) : undefined;
  
  debug(`Pagination: limit=${limit}, offset=${offset}`);
  return { 
    limit: !isNaN(Number(limit)) ? Number(limit) : undefined, 
    offset: !isNaN(Number(offset)) ? Number(offset) : undefined 
  };
}

/**
 * Apply all query options to a database query
 */
export function applyQueryOptions<T extends PgTableWithColumns<any>>(
  table: T,
  options: QueryOptions
) {
  const conditions = parseFilter(options.filter);
  const whereClause = applyFilterConditions(table, conditions);
  const orderClauses = parseOrderBy(table, options.orderBy);
  const { limit, offset } = parsePagination(options.top, options.skip);
  
  return {
    whereClause,
    orderClauses,
    limit,
    offset,
    selectedFields: parseSelect(options.select),
    expandRelations: parseExpand(options.expand)
  };
}

/**
 * Generate pagination metadata for response
 */
export function generatePaginationMetadata(
  totalRecords: number,
  limit?: number,
  offset?: number,
  baseUrl?: string
) {
  // If no pagination params were specified
  if (limit === undefined) {
    return {
      metadata: {
        totalRecords,
        currentPage: 1,
        totalPages: 1,
        nextPage: null,
        previousPage: null
      }
    };
  }
  
  // Calculate current page (1-based) and total pages
  const currentPage = offset !== undefined ? Math.floor(offset / limit) + 1 : 1;
  const totalPages = Math.ceil(totalRecords / limit);
  
  // Prepare pagination metadata
  const metadata = {
    totalRecords,
    currentPage,
    totalPages,
    nextPage: null as string | null,
    previousPage: null as string | null
  };
  
  // Add nextPage and previousPage URLs if baseUrl is provided
  if (baseUrl) {
    const url = new URL(baseUrl);
    const params = new URLSearchParams(url.search);
    
    // Next page
    if (currentPage < totalPages) {
      const nextOffset = offset !== undefined ? offset + limit : limit;
      params.set('top', String(limit));
      params.set('skip', String(nextOffset));
      
      const nextUrl = new URL(url.pathname, url.origin);
      nextUrl.search = params.toString();
      metadata.nextPage = nextUrl.toString();
    }
    
    // Previous page
    if (currentPage > 1 && offset !== undefined) {
      const prevOffset = Math.max(0, offset - limit);
      params.set('top', String(limit));
      params.set('skip', String(prevOffset));
      
      const prevUrl = new URL(url.pathname, url.origin);
      prevUrl.search = params.toString();
      metadata.previousPage = prevUrl.toString();
    }
  }
  
  return { metadata };
}

/**
 * Build a cache key based on query parameters
 */
export function buildCacheKey(baseKey: string, options: QueryOptions): string {
  const parts = [baseKey];
  
  if (options.filter) parts.push(`filter=${options.filter}`);
  if (options.select) parts.push(`select=${options.select}`);
  if (options.expand) parts.push(`expand=${options.expand}`);
  if (options.orderBy) parts.push(`orderBy=${options.orderBy}`);
  if (options.top) parts.push(`top=${options.top}`);
  if (options.skip) parts.push(`skip=${options.skip}`);
  
  return parts.join(':');
}

/**
 * Generate a documentation string for the query parameters
 */
export function getQueryParametersDocumentation(): string {
  return `
# Query Parameters Guide

This API supports the following query parameters for filtering, selecting fields, and pagination:

## Filter

Use the \`filter\` parameter to filter results based on field values.

Syntax: \`field operator value\`

Supported operators:
- \`eq\`: Equals
- \`ne\`: Not equals
- \`gt\`: Greater than
- \`ge\`: Greater than or equals
- \`lt\`: Less than
- \`le\`: Less than or equals
- \`contains\`: Contains substring (case-sensitive)
- \`containsi\`: Contains substring (case-insensitive)
- \`startswith\`: Starts with
- \`endswith\`: Ends with
- \`in\`: In a list of values
- \`nin\`: Not in a list of values

Examples:
- \`?filter=name eq 'John'\`
- \`?filter=age gt 30\`
- \`?filter=title contains 'Manager'\`
- \`?filter=status in 'active,pending'\`
- \`?filter=createdAt gt '2023-01-01'\`

Multiple conditions can be combined with \`and\` and \`or\`:
- \`?filter=name eq 'John' and age gt 30\`
- \`?filter=(status eq 'active' or status eq 'pending') and createdAt gt '2023-01-01'\`

## Select

Use the \`select\` parameter to specify which fields to include in the response.

Example: \`?select=id,name,email\`

If not specified, all fields will be returned.

## Expand

Use the \`expand\` parameter to include related entities in the response.

Example: \`?expand=department,role\`

## OrderBy

Use the \`orderBy\` parameter to sort the results.

Syntax: \`field direction\`

Example: 
- \`?orderBy=name asc\`
- \`?orderBy=createdAt desc\`
- \`?orderBy=department asc,name desc\` (multiple fields)

If direction is omitted, \`asc\` is used.

## Pagination

Use the \`top\` and \`skip\` parameters for pagination.

- \`top\`: Maximum number of records to return
- \`skip\`: Number of records to skip

Example: \`?top=10&skip=20\` (return records 21-30)

The response will include pagination metadata with the following structure:
\`\`\`json
{
  "data": [...],  // The actual records
  "metadata": {
    "totalRecords": 100,  // Total number of records
    "currentPage": 3,     // Current page number (1-based)
    "totalPages": 10,     // Total number of pages
    "nextPage": "http://example.com/api/resource?top=10&skip=30",  // URL to next page (or null)
    "previousPage": "http://example.com/api/resource?top=10&skip=10"  // URL to previous page (or null)
  }
}
\`\`\`
`;
}