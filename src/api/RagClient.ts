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

export interface UploadResult {
  sessionId: string;
  chunks_added: number;
  source: string;
}

export const uploadPdf = async (
  file: File,
  sessionId?: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const form = new FormData();
  form.append('file', file);
  const url = new URL(`${BASE_URL}/rag/upload`);
  if (sessionId) url.searchParams.set('sessionId', sessionId);
  const { data } = await axios.post(url.toString(), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        const percent = Math.round((evt.loaded * 100) / evt.total);
        onProgress(percent);
      }
    }
  });
  return data as UploadResult;
};

export const clearRag = async (sessionId?: string): Promise<void> => {
  const url = new URL(`${BASE_URL}/rag/clear`);
  if (sessionId) url.searchParams.set('sessionId', sessionId);
  await axios.delete(url.toString());
};


