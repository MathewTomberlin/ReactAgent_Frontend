import axios from 'axios';

const getApiBaseUrl = (): string => {
  if ((import.meta as any).env?.VITE_API_BASE) {
    return (import.meta as any).env.VITE_API_BASE;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8080';
  }
  return `http://${window.location.hostname}:8080`;
};

const BASE_URL = getApiBaseUrl();
const getClientId = (): string => {
  const key = 'reactagent_client_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
};

export interface UploadResult {
  sessionId: string;
  chunks_added: number;
  source: string;
}

export const uploadDocument = async (
  file: File,
  sessionId?: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const form = new FormData();
  form.append('file', file);
  const url = new URL(`${BASE_URL}/rag/upload`);
  if (sessionId) url.searchParams.set('sessionId', sessionId);
  const { data } = await axios.post(url.toString(), form, {
    headers: { 'Content-Type': 'multipart/form-data', 'X-Client-Id': getClientId() },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        const percent = Math.round((evt.loaded * 100) / evt.total);
        onProgress(percent);
      }
    }
  });
  return data as UploadResult;
};

// Legacy function for backward compatibility
export const uploadPdf = uploadDocument;

export interface SupportedFileTypes {
  extensions: string[];
  mimeTypes: string[];
  description: string;
}

export interface RagSessionStatus {
  sessionId: string;
  hasContext: boolean;
  chunkCount: number;
  sources: string[];
}

export const getSupportedFileTypes = async (): Promise<SupportedFileTypes> => {
  const url = new URL(`${BASE_URL}/rag/supported-types`);
  const { data } = await axios.get(url.toString(), { headers: { 'X-Client-Id': getClientId() } });
  return data as SupportedFileTypes;
};

export const getRagSessionStatus = async (sessionId?: string): Promise<RagSessionStatus> => {
  const url = new URL(`${BASE_URL}/rag/status`);
  if (sessionId) url.searchParams.set('sessionId', sessionId);
  const { data } = await axios.get(url.toString(), { headers: { 'X-Client-Id': getClientId() } });
  return data as RagSessionStatus;
};

export const clearRag = async (sessionId?: string): Promise<void> => {
  const url = new URL(`${BASE_URL}/rag/clear`);
  if (sessionId) url.searchParams.set('sessionId', sessionId);
  await axios.delete(url.toString(), { headers: { 'X-Client-Id': getClientId() } });
};

export const clearRagSource = async (sourceName: string, sessionId?: string): Promise<{ sessionId: string; sourceName: string; chunksRemoved: number }> => {
  const url = new URL(`${BASE_URL}/rag/clear-source`);
  url.searchParams.set('sourceName', sourceName);
  if (sessionId) url.searchParams.set('sessionId', sessionId);
  const { data } = await axios.delete(url.toString(), { headers: { 'X-Client-Id': getClientId() } });
  return data;
};


