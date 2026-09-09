import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "header";
  showText?: boolean;
  textColor?: "dark" | "light";
  className?: string;
}

export function CabinetLogo({
  size = "header",
  showText = true,
  textColor = "dark",
  className = "",
}: LogoProps) {
  if (size === "header") {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        {/* الشعار الرسمي لجمهورية مصر العربية — رئاسة مجلس الوزراء */}
        <div className="flex-shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="شعار جمهورية مصر العربية"
            width={40}
            height={40}
            className="w-10 h-10 object-contain drop-shadow-xs"
          />
        </div>

        {showText && (
          <div className="flex flex-col text-right leading-tight">
            <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium font-body">
              <span>جمهورية مصر العربية</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 font-semibold font-heading">رئاسة مجلس الوزراء</span>
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 font-heading tracking-tight mt-0.5">
              اللجنة العليا للمسؤولية الطبية وسلامة المريض
            </h1>
          </div>
        )}
      </div>
    );
  }

  const dimensions = {
    sm: { imgSize: 32, titleClass: "text-xs", subClass: "text-[11px]" },
    md: { imgSize: 42, titleClass: "text-sm", subClass: "text-xs" },
    lg: { imgSize: 56, titleClass: "text-base", subClass: "text-xs" },
    xl: { imgSize: 80, titleClass: "text-xl", subClass: "text-sm" },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="flex-shrink-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="شعار جمهورية مصر العربية"
          width={dimensions.imgSize}
          height={dimensions.imgSize}
          className="object-contain drop-shadow-sm"
        />
      </div>

      {showText && (
        <div className="flex flex-col text-right leading-tight">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`font-semibold tracking-wide ${dimensions.subClass} ${
                textColor === "light" ? "text-amber-300" : "text-slate-500"
              }`}
            >
              جمهورية مصر العربية
            </span>
            <span className={textColor === "light" ? "text-slate-400 text-xs" : "text-slate-400 text-xs"}>
              •
            </span>
            <span
              className={`font-bold ${dimensions.subClass} ${
                textColor === "light" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              رئاسة مجلس الوزراء
            </span>
          </div>
          <h1
            className={`font-bold ${dimensions.titleClass} leading-snug tracking-tight ${
              textColor === "light" ? "text-white" : "text-slate-900"
            }`}
          >
            اللجنة العليا للمسؤولية الطبية وسلامة المريض
          </h1>
        </div>
      )}
    </div>
  );
}
