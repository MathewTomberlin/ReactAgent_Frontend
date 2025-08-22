import React, { useEffect, useRef, useState, useCallback } from 'react';
import { uploadPdf, clearRag } from '../api/RagClient';
import { useSettings } from '../context/SettingsContext';
import { Tooltip } from './Tooltip';

type FileState = {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number; // 0..100
  status: 'queued' | 'uploading' | 'uploaded' | 'error';
  chunks?: number;
  error?: string;
};

export const RagUploader = React.memo(({ sessionId }: { sessionId?: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileState[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    // reset progress when session changes
    setFiles([]);
  }, [sessionId]);

  const enqueueFiles = (fileList: FileList) => {
    const toAdd: FileState[] = [];
    Array.from(fileList).forEach((f) => {
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        return;
      }
      toAdd.push({
        id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
        file: f,
        name: f.name,
        size: f.size,
        progress: 0,
        status: 'queued'
      });
    });
    if (toAdd.length) setFiles((prev) => [...prev, ...toAdd]);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) enqueueFiles(e.target.files);
    // reset input to allow re-selecting same file
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) enqueueFiles(e.dataTransfer.files);
  };

  const startUpload = async () => {
    if (!files.length || busy) return;
    setBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (files[i].status === 'uploaded') continue;
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading', progress: 0 } : f));
        try {
          const res = await uploadPdf(files[i].file, sessionId, (p) => {
            setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, progress: p } : f));
          });
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploaded', progress: 100, chunks: res.chunks_added } : f));
        } catch (err: any) {
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err?.message || 'Upload failed' } : f));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const clearSession = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearRag(sessionId);
      setFiles([]);
    } finally {
      setBusy(false);
    }
  };

  const humanSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label="Upload PDF"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onFileInput}
          className="hidden"
          multiple
        />
        <div className="flex items-center justify-center space-x-2 text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span className="text-sm">Drag & drop PDFs here or click to select</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">Up to a few PDFs. Only .pdf files are accepted.</div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">Selected: {files.length} file{files.length > 1 ? 's' : ''}</div>
            <div className="space-x-2">
              <Tooltip content="Upload the selected PDF files to make their content available for AI responses in this session.">
                <button
                  onClick={startUpload}
                  disabled={busy || files.every(f => f.status === 'uploaded')}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? 'Uploading...' : 'Upload'}
                </button>
              </Tooltip>
              <Tooltip content="Remove all uploaded documents from this session. The AI will no longer have access to their content.">
                <button
                  onClick={clearSession}
                  disabled={busy}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Clear Session Docs
                </button>
              </Tooltip>
            </div>
          </div>

          <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {files.map((f) => (
              <li key={f.id} className="bg-white border border-gray-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 mr-2">
                    <div className="truncate text-sm text-gray-800" title={f.name}>{f.name}</div>
                    <div className="text-xs text-gray-500">{humanSize(f.size)}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {f.status === 'queued' && <span className="px-2 py-0.5 bg-gray-100 rounded">Queued</span>}
                    {f.status === 'uploading' && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Uploading {f.progress}%</span>}
                    {f.status === 'uploaded' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Uploaded{typeof f.chunks === 'number' ? ` (${f.chunks} chunks)` : ''}</span>}
                    {f.status === 'error' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">Error</span>}
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded overflow-hidden">
                  <div className={`h-full ${f.status === 'error' ? 'bg-red-400' : 'bg-blue-500'}`} style={{ width: `${f.progress}%` }} />
                </div>
                {f.error && <div className="mt-1 text-xs text-red-600">{f.error}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {settings.displayMessageTokens && (
        <div className="text-xs text-gray-500">Note: Uploaded docs are used only within your current session to keep costs near zero.</div>
      )}
    </div>
  );
});

RagUploader.displayName = 'RagUploader';


