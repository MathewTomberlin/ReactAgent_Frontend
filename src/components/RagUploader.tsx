import React, { useEffect, useRef, useState, useCallback } from 'react';
import { uploadDocument, clearRag, clearRagSource, getSupportedFileTypes, getRagSessionStatus, type SupportedFileTypes, type RagSessionStatus } from '../api/RagClient';
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
  const [supportedTypes, setSupportedTypes] = useState<SupportedFileTypes | null>(null);
  const [sessionStatus, setSessionStatus] = useState<RagSessionStatus | null>(null);
  const { settings } = useSettings();

  // Load supported file types on component mount
  useEffect(() => {
    const loadSupportedTypes = async () => {
      try {
        const types = await getSupportedFileTypes();
        setSupportedTypes(types);
      } catch (error) {
        console.error('Failed to load supported file types:', error);
        // Fallback to basic types if API fails
        setSupportedTypes({
          extensions: ['pdf', 'txt', 'md', 'csv', 'json', 'xml', 'html'],
          mimeTypes: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml', 'text/html'],
          description: 'Supported file types for document upload'
        });
      }
    };
    loadSupportedTypes();
  }, []);

  useEffect(() => {
    // reset progress when session changes
    setFiles([]);
    
    // Check if session has uploaded documents
    if (sessionId) {
      const checkSessionStatus = async () => {
        try {
          const status = await getRagSessionStatus(sessionId);
          setSessionStatus(status);
        } catch (error) {
          console.error('Failed to check session status:', error);
          setSessionStatus(null);
        }
      };
      checkSessionStatus();
    } else {
      setSessionStatus(null);
    }
  }, [sessionId]);

  const enqueueFiles = (fileList: FileList) => {
    const toAdd: FileState[] = [];
    Array.from(fileList).forEach((f) => {
      // Check if file type is supported
      const isSupported = supportedTypes?.extensions.some(ext => 
        f.name.toLowerCase().endsWith(`.${ext}`)
      ) || supportedTypes?.mimeTypes.includes(f.type);
      
      if (!isSupported) {
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
          const res = await uploadDocument(files[i].file, sessionId, (p) => {
            setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, progress: p } : f));
          });
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploaded', progress: 100, chunks: res.chunks_added } : f));
          
          // Update session status after successful upload
          if (sessionId) {
            try {
              const status = await getRagSessionStatus(sessionId);
              setSessionStatus(status);
            } catch (error) {
              console.error('Failed to update session status:', error);
            }
          }
        } catch (err: any) {
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err?.message || 'Upload failed' } : f));
        }
      }
      
      // Clear selected files after successful upload with a short delay
      setTimeout(() => {
        setFiles([]);
        
        // Reset file input to allow re-selecting the same file
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }, 1000); // 2 second delay
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
      // Update session status after clearing
      if (sessionId) {
        const status = await getRagSessionStatus(sessionId);
        setSessionStatus(status);
      }
    } finally {
      setBusy(false);
    }
  };

  const clearSource = async (sourceName: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await clearRagSource(sourceName, sessionId);
      // Update session status after clearing individual source
      if (sessionId) {
        const status = await getRagSessionStatus(sessionId);
        setSessionStatus(status);
      }
    } catch (error) {
      console.error('Failed to clear source:', error);
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
          accept={supportedTypes?.extensions.map(ext => `.${ext}`).join(',') || ".pdf,.txt,.md,.csv,.json,.xml,.html,.xlsx,.xls,.docx,.doc"}
          onChange={onFileInput}
          className="hidden"
          multiple
        />
        <div className="flex items-center justify-center space-x-2 text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span className="text-sm">Drag & drop documents here or click to select</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Supported: PDF, Excel (.xlsx, .xls), Word (.docx, .doc), Text (.txt, .md, .csv, .json, .xml, .html)
        </div>
      </div>

      {/* File selection and upload */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">Selected: {files.length} file{files.length > 1 ? 's' : ''}</div>
            <div className="space-x-2">
              <Tooltip content="Upload the selected documents to make their content available for AI responses in this session.">
                <button
                  onClick={startUpload}
                  disabled={busy || files.every(f => f.status === 'uploaded')}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? 'Uploading...' : 'Upload'}
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

      {/* Session Status - Show uploaded documents info */}
      {sessionStatus?.hasContext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="space-y-3">
            {/* Sources section */}
            {sessionStatus.sources.length > 0 && (
              <div className="border border-blue-200 rounded bg-white">
                <div className="p-3 border-b border-blue-200 bg-blue-25">
                  <div className="text-sm font-medium text-blue-800 mb-1">Sources</div>
                  <div className="text-xs text-blue-600">
                    {sessionStatus.chunkCount} chunks from {sessionStatus.sources.length} document{sessionStatus.sources.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="p-3">
                  <div className="space-y-2">
                    {sessionStatus.sources.map((source, index) => {
                      return (
                        <div key={index} style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr auto', 
                          gap: '8px',
                          alignItems: 'center',
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '6px', 
                          padding: '8px 12px',
                          width: '100%',
                          boxSizing: 'border-box',
                          transition: 'box-shadow 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div 
                            style={{ 
                              color: '#374151', 
                              fontSize: '13px', 
                              fontWeight: '500',
                              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0,
                              lineHeight: '1.4'
                            }}
                            title={source || 'No filename'}
                          >
                            {source || 'No filename'}
                          </div>
                          <Tooltip content={`Remove all chunks from ${source}`}>
                            <button
                              onClick={() => clearSource(source)}
                              disabled={busy}
                              style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: '500',
                                cursor: busy ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                opacity: busy ? 0.6 : 1,
                                transform: 'translateY(0)',
                                boxShadow: '0 1px 2px rgba(239, 68, 68, 0.2)'
                              }}
                              onMouseOver={(e) => {
                                if (!busy) {
                                  const btn = e.target as HTMLButtonElement;
                                  btn.style.backgroundColor = '#dc2626';
                                  btn.style.transform = 'translateY(-1px)';
                                  btn.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.3)';
                                }
                              }}
                              onMouseOut={(e) => {
                                if (!busy) {
                                  const btn = e.target as HTMLButtonElement;
                                  btn.style.backgroundColor = '#ef4444';
                                  btn.style.transform = 'translateY(0)';
                                  btn.style.boxShadow = '0 1px 2px rgba(239, 68, 68, 0.2)';
                                }
                              }}
                            >
                              Clear
                            </button>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Clear All button */}
            <div className="flex justify-center">
              <Tooltip content="Remove all uploaded documents from this session. The AI will no longer have access to their content.">
                <button
                  onClick={clearSession}
                  disabled={busy}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Clear All Documents
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      )}





      {settings.displayMessageTokens && (
        <div className="text-xs text-gray-500">Note: Uploaded docs are used only within your current session to keep costs near zero.</div>
      )}
    </div>
  );
});

RagUploader.displayName = 'RagUploader';


