"use client";

import React, { useCallback, useState, useRef } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export default function FileDropZone({ onFileSelect, accept = ".xlsx,.csv,.xls", disabled = false }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-[#1E293B]/50 border border-[#22C55E]/30">
        <div className="p-2 rounded-lg bg-[#22C55E]/10">
          <FileSpreadsheet className="w-6 h-6 text-[#22C55E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ag-primary truncate">{selectedFile.name}</p>
          <p className="text-xs text-ag-secondary">{formatSize(selectedFile.size)}</p>
        </div>
        <button
          onClick={clearFile}
          className="p-1.5 rounded-md hover:bg-[#1E293B] text-ag-secondary hover:text-ag-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200
        ${isDragging
          ? "border-[#22C55E] bg-[#22C55E]/5"
          : "border-ag hover:border-ag-hover hover:bg-ag-card/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <div className={`p-3 rounded-full transition-colors ${isDragging ? "bg-[#22C55E]/10" : "bg-[#1E293B]"}`}>
        <Upload className={`w-6 h-6 ${isDragging ? "text-[#22C55E]" : "text-ag-secondary"}`} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-ag-primary">
          {isDragging ? "Drop file here" : "Drag & drop your file here"}
        </p>
        <p className="text-xs text-ag-secondary mt-1">or click to browse — .xlsx, .csv supported</p>
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFileInput} className="hidden" disabled={disabled} />
    </div>
  );
}