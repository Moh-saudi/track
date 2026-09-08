"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

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
            ? "border-gov-300 bg-gov-50 opacity-70 cursor-not-allowed"
            : "border-gray-300 hover:border-gov-400 hover:bg-gov-50"
          }`}
      >
        {uploading ? (
          <>
            <div className="loading-spinner w-6 h-6" />
            <span className="text-xs text-gray-500">جارِ الرفع...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-xs text-gray-500">رفع مرفق جديد</span>
            <span className="text-[10px] text-gray-400">PDF، صور، Word — حتى {MAX_MB}MB</span>
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
