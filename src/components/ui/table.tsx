import * as React from "react";

import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/ui/table-pagination";
import { getTablePage } from "@/utils/tablePagination";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  paginate?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, paginate = true, ...props }, ref) => {
    const [pageSize, setPageSize] = React.useState(10);
    const [selection, setSelection] = React.useState({ signature: "", page: 1 });
    const sections = React.Children.toArray(children);
    const body = sections.find((child): child is React.ReactElement<React.HTMLAttributes<HTMLTableSectionElement>> =>
      React.isValidElement(child) && child.type === TableBody);
    const rows = React.Children.toArray(body?.props.children);
    // A single spanning cell is the existing empty/loading state, not a data row.
    const empty = rows.length === 1 && React.isValidElement<{ children?: React.ReactNode }>(rows[0]) &&
      React.Children.toArray(rows[0].props.children).some(cell =>
        React.isValidElement<{ colSpan?: number }>(cell) && (cell.props.colSpan ?? 1) > 1);
    const total = empty ? 0 : rows.length;
    const signature = rows.map(row => React.isValidElement(row) ? String(row.key) : String(row)).join("|");
    const range = getTablePage(total, selection.signature === signature ? selection.page : 1, pageSize);
    const enabled = paginate && !!body;
    const visibleSections = enabled ? sections.map(section => section === body && body
      ? React.cloneElement(body, {}, empty ? rows : rows.slice(range.start, range.end)) : section) : sections;

    return (
      <div className="relative w-full min-w-0">
        <div className="w-full overflow-auto">
          <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props}>{visibleSections}</table>
        </div>
        {enabled && <TablePagination total={total} page={range.page} pageSize={pageSize}
          onPageChange={page => setSelection({ signature, page })}
          onPageSizeChange={size => { setPageSize(size); setSelection({ signature, page: 1 }); }} />}
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
