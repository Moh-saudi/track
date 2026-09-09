"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_MB = 15;

export function AttachmentUploader({ caseId }: { caseId: string }) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [progress,  setProgress]  = useState(0);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // تحقق محلي من النوع والحجم
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("نوع الملف غير مسموح به (PDF، صور، Word فقط)");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`حجم الملف يتجاوز ${MAX_MB}MB`);
      return;
    }

    setUploading(true);
    setProgress(30);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/cases/${caseId}/attachments`, {
      method: "POST",
      body: formData,
    });

    setProgress(90);
    setUploading(false);
    setProgress(0);

    if (inputRef.current) inputRef.current.value = "";

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "تعذّر رفع الملف");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <label
        htmlFor={`attachment-${caseId}`}
        className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors
          ${uploading
            ? "border-teal-300 bg-teal-50/50 opacity-70 cursor-not-allowed"
            : "border-slate-300 hover:border-teal-400 hover:bg-teal-50/30"
          }`}
      >
        {uploading ? (
          <>
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500">جارِ الرفع...</span>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-slate-400" />
            <span className="text-xs text-slate-600 font-medium">رفع مرفق جديد</span>
            <span className="text-[10px] text-slate-400">PDF، صور، Word — حتى {MAX_MB}MB</span>
          </>
        )}
        <input
          id={`attachment-${caseId}`}
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          disabled={uploading}
          onChange={handleChange}
          className="sr-only"
        />
      </label>

      {error && (
        <p className="error-msg mt-2">{error}</p>
      )}
    </div>
  );
}
