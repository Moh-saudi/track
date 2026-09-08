import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textColor?: "dark" | "light";
}

export function CabinetLogo({ size = "md", showText = true, textColor = "light" }: LogoProps) {
  const dimensions = {
    sm: { imgSize: 34, titleClass: "text-xs", subClass: "text-[10px]" },
    md: { imgSize: 46, titleClass: "text-sm", subClass: "text-xs" },
    lg: { imgSize: 60, titleClass: "text-base", subClass: "text-xs" },
    xl: { imgSize: 84, titleClass: "text-xl", subClass: "text-sm" },
  }[size];

  return (
    <div className="flex items-center gap-3 select-none">
      {/* الشعار الرسمي لجمهورية مصر العربية — رئاسة مجلس الوزراء */}
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
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`font-bold tracking-wide ${dimensions.subClass} ${textColor === "light" ? "text-amber-300" : "text-amber-800"}`}>
              جمهورية مصر العربية
            </span>
            <span className={textColor === "light" ? "text-slate-400 text-[10px]" : "text-slate-400 text-[10px]"}>•</span>
            <span className={`font-bold ${dimensions.subClass} ${textColor === "light" ? "text-slate-200" : "text-slate-700"}`}>
              رئاسة مجلس الوزراء
            </span>
          </div>
          <h1 className={`font-black ${dimensions.titleClass} leading-snug tracking-tight ${textColor === "light" ? "text-white" : "text-slate-900"}`}>
            اللجنة العليا للمسؤولية الطبية وسلامة المريض
          </h1>
        </div>
      )}
    </div>
  );
}
