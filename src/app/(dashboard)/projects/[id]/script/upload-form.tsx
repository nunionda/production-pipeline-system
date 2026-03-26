"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ScriptUploadFormProps {
  projectId: string;
}

export function ScriptUploadForm({ projectId }: ScriptUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", selectedFile.name.replace(/\.[^/.]+$/, ""));

    try {
      const res = await fetch(`/api/projects/${projectId}/scripts`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "업로드에 실패했습니다");
        setUploading(false);
        return;
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["docx", "txt", "hwp"].includes(ext || "")) {
      setError("지원 형식: .docx, .txt, .hwp");
      return;
    }
    setError("");
    setSelectedFile(file);
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
          {error}
        </div>
      )}

      <div
        className={`flex flex-col items-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileSelect(file);
        }}
      >
        <span className="text-3xl">📄</span>

        {selectedFile ? (
          <div className="mt-3 text-center">
            <p className="text-sm font-medium text-gray-900">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? "업로드 중..." : "업로드 및 분석 시작"}
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-gray-500">
              시나리오 파일을 드래그하거나 클릭하여 선택하세요
            </p>
            <p className="mt-1 text-xs text-gray-400">
              .docx, .txt 지원 (최대 20MB)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              파일 선택
            </button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.txt,.hwp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>
    </div>
  );
}
