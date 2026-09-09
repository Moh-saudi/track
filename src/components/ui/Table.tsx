import React from "react";

export function Table({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className={`w-full text-right text-xs font-body border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 font-heading ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot className={`bg-slate-50 font-medium text-slate-700 border-t border-slate-200 ${className}`} {...props}>
      {children}
    </tfoot>
  );
}

export function TableRow({
  className = "",
  delayed = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { delayed?: boolean }) {
  const delayedClass = delayed ? "bg-red-50/80 hover:bg-red-100/80 border-r-4 border-r-red-600 text-slate-900" : "hover:bg-slate-50/70";
  return (
    <tr className={`transition-colors border-b border-slate-100 last:border-b-0 ${delayedClass} ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({
  className = "",
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-4 py-3 text-right whitespace-nowrap font-bold text-slate-600 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({
  className = "",
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-middle text-slate-700 ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableCaption({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption className={`mt-4 text-xs text-slate-500 font-body ${className}`} {...props}>
      {children}
    </caption>
  );
}
