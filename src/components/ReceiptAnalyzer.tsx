import React, { useState, useRef } from "react";
import { ReceiptScan, ReceiptItem } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { UploadCloud, FileText, AlertCircle, CheckCircle, ChevronDown, Leaf, Loader2, Coins } from "lucide-react";

interface ReceiptAnalyzerProps {
  userId: string;
  onScanCompleted: (scan: ReceiptScan) => void;
}

export default function ReceiptAnalyzer({ userId, onScanCompleted }: ReceiptAnalyzerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [analyzedScan, setAnalyzedScan] = useState<ReceiptScan | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    // MIME checks
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, WEBP). PDF uploads aren't supported on vision endpoints directly.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        // Query Express API route holding server-side Google GenAI Vision pipeline
        const result = await fetch("/api/gemini/analyze-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
          }),
        });

        if (!result.ok) {
          throw new Error("Analysis failed. Please try again with clear, high-contrast imagery.");
        }

        const data = await result.json();

        // Build scan result entry
        const scanId = "scan_" + Date.now();
        const newScan: ReceiptScan = {
          scanId,
          userId,
          estimatedCO2: data.estimatedCO2,
          notes: data.notes,
          detectedItems: data.detectedItems || [],
          timestamp: new Date().toISOString(),
        };

        // Save scan log inside Firestore
        const targetPath = `users/${userId}/receipts/${scanId}`;
        await setDoc(doc(db, "users", userId, "receipts", scanId), newScan);

        setAnalyzedScan(newScan);
        onScanCompleted(newScan);
        setSuccess("Receipt image successfully scanned & carbon offsets estimated!");
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong during vision transcription.");
      } finally {
        setUploading(false);
      }
    };
  };

  return (
    <div id="receipt_analyzer_panel" className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-brand space-y-6 theme-transition">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl">
          <UploadCloud className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Receipt Vision Carbon Analyzer
          </h2>
          <p className="text-xs text-text-secondary">
            Upload retail receipts or grocery slips. Gemini extracts items to estimate total lifecycle carbon exhaust.
          </p>
        </div>
      </div>

      {/* Drag & drop form */}
      <div
        id="uploader_container"
        role="button"
        tabIndex={0}
        aria-label="Receipt upload field. Select or drag and drop receipt images here to analyze carbon emissions factors."
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-[28px] p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          dragActive
            ? "border-brand-primary bg-brand-secondary/40"
            : "border-border-brand bg-brand-bg hover:bg-brand-secondary/20"
        }`}
      >
        <input
          id="receipt_file_selector"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
            <p className="text-xs font-semibold text-text-primary">
              Gemini parsing receipt items & looking up emissions factors...
            </p>
            <p className="text-2xs text-text-secondary">
              Typically takes 3 to 5 seconds. Avoid closing page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-secondary flex items-center justify-center text-brand-primary mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-text-primary">
              Drag-and-drop receipt receipt, or click here to browse
            </p>
            <p className="text-2xs text-text-secondary">
              Supports JPEG, PNG, WEBP slips up to 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-xs flex items-center gap-2 border border-rose-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" stroke="currentColor" />
          <span>{success}</span>
        </div>
      )}

      {/* Extracted Scan Item Details */}
      {analyzedScan && (
        <div className="border border-border-brand p-5 rounded-[28px] bg-brand-bg space-y-4">
          <div className="flex items-center justify-between border-b border-border-brand pb-3">
            <span className="font-bold text-sm text-brand-primary flex items-center gap-1.5">
              <Leaf className="w-4 h-4" /> Extracted Carbon Audit
            </span>
            <span className="font-mono text-base font-extrabold text-brand-primary">
              {analyzedScan.estimatedCO2} kg CO₂e Total
            </span>
          </div>

          {analyzedScan.notes && (
            <p className="text-xs text-text-primary leading-relaxed italic bg-bg-card p-3 rounded-xl border border-border-brand theme-transition">
              💡 {analyzedScan.notes}
            </p>
          )}

          <div className="space-y-2">
            <span className="block text-2xs uppercase font-semibold tracking-wider text-text-secondary">
              Parsed Line-Item details
            </span>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {analyzedScan.detectedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-bg-card p-3 rounded-2xl border border-border-brand shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2 theme-transition"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-text-primary block">
                      {item.name}
                    </span>
                    <span className="text-2xs text-text-secondary bg-brand-bg px-2 py-0.5 rounded-full inline-block">
                      Category: {item.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    {item.price && (
                      <span className="text-2xs text-text-secondary font-mono flex items-center gap-0.5">
                        <Coins className="w-3 h-3" /> ${item.price.toFixed(2)}
                      </span>
                    )}

                    <span className="font-mono font-bold text-text-primary text-xs">
                      {item.co2e} kg CO₂e
                    </span>

                    {item.sustainabilityScore && (
                      <span className={`text-2xs px-2 py-0.5 rounded-full font-bold ${
                        item.sustainabilityScore >= 7
                          ? "bg-brand-secondary text-brand-dark"
                          : item.sustainabilityScore >= 4
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-rose-50 text-rose-600"
                      }`}>
                        Score: {item.sustainabilityScore}/10
                      </span>
                    )}
                  </div>

                  {item.ecoAlternative && (
                    <div className="w-full text-2xs text-brand-primary italic mt-1 border-t border-dashed border-border-brand pt-1.5 md:hidden">
                      🌱 Substitute: {item.ecoAlternative}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
