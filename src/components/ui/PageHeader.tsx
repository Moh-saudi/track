import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumbs = [{ label: "الرئيسية", href: "/dashboard" }],
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`mb-6 space-y-2 ${className}`}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="مسار التصفح" className="flex items-center gap-1.5 text-xs text-slate-500 font-body">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-teal-700 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-slate-800 font-medium" : ""}>
                    {item.label}
                  </span>
                )}
                {!isLast && <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading text-slate-900 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 font-body mt-1">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
