// @l0 L0-002 · @req CORA-02/REQ-1,REQ-2,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-3.1 · @ua —
"use client";

import { useState, useRef } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "audio/mpeg",
  "audio/wav",
];

export default function IngestaPage() {
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    validateAndSetFile(selected);
  };

  const validateAndSetFile = (selected?: File | null) => {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
      setError(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("File exceeds 10MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (texto) return; // Mutually exclusive
    const dropped = e.dataTransfer.files?.[0];
    validateAndSetFile(dropped);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto && !file) {
      setError("Provide either text or a file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    } else if (texto) {
      formData.append("text", texto);
    }

    try {
      const res = await fetch("/api/ingesta", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data.detail ?? data.error ?? "fallo la ingesta") + (data.causa ? " :: " + data.causa : ""));
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ingesta</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Text Input</label>
          <textarea
            className="w-full p-2 border rounded-md disabled:bg-gray-100"
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={!!file || loading}
            placeholder={file ? "Clear file to enter text" : "Enter text to ingest..."}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">File Input (Max 10MB)</label>
          <div
            className={`border-2 border-dashed rounded-md p-6 text-center ${
              texto || loading ? "bg-gray-100 border-gray-300" : "bg-white border-blue-400 cursor-pointer"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={!!texto || loading}
              className="hidden"
              accept={ALLOWED_MIME_TYPES.join(",")}
              id="file-upload"
            />
            <label htmlFor="file-upload" className={texto || loading ? "pointer-events-none text-gray-400" : "cursor-pointer text-blue-600 hover:underline"}>
              {file ? file.name : "Click to upload or drag and drop"}
            </label>
            {!file && !texto && <p className="text-xs text-gray-500 mt-2">TXT, PDF, PNG, JPEG, MP3, WAV</p>}
          </div>
          {file && (
            <button
              type="button"
              className="text-red-500 text-sm mt-2"
              onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
              disabled={loading}
            >
              Remove File
            </button>
          )}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading || (!texto && !file)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          Ingestar
        </button>

        {loading && <p className="text-sm text-gray-600 mt-2">esto puede tomar hasta 60s</p>}
      </form>

      {result && (
        <div className="mt-8 p-4 border rounded-md bg-gray-50">
          <h2 className="font-bold text-lg mb-4">Result</h2>
          <pre className="whitespace-pre-wrap break-all text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
