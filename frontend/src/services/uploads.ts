import api from "@/lib/api";

export interface UploadImageResponse {
  url: string;
  filename: string;
  size_bytes: number;
}

const API_BASE = import.meta.env.VITE_API_URL;
const toAbsolute = (u: string) =>
  u.startsWith("http://") || u.startsWith("https://") ? u : `${API_BASE}${u}`;

export const uploadsService = {
  async uploadImage(file: File, onProgress?: (percent: number) => void): Promise<UploadImageResponse> {
    const form = new FormData();
    form.append("file", file);

    const resp = await api.post<UploadImageResponse>("/uploads/image", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });

    const data = resp.data;
    return { ...data, url: toAbsolute(data.url) };
  },
};
