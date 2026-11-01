import { getOrCreateSessionToken } from './supabase';

const DEFAULT_PROD_API_URL = "https://janpulse.onrender.com";

export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  let u = (raw || '').trim().replace(/^['"]|['"]$/g, '');

  if (u && !u.includes('<') && !u.includes('your-api-url') && !u.includes('yourdomain.com')) {
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    // Automatically sanitize and strip any accidental /docs or trailing slashes
    return u.replace(/\/docs\/?$/i, '').replace(/\/+$/, '');
  }

  // If running in browser and NOT on localhost, automatically route to production Render API
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return DEFAULT_PROD_API_URL;
    }
    return "http://localhost:8000";
  }

  return process.env.NODE_ENV === 'production' ? DEFAULT_PROD_API_URL : "http://localhost:8000";
}

export interface StreamEvent {
  type: string;
  [key: string]: any;
}

export async function createRunStream(
  text: string,
  kind: "forward" | "eligibility" | "notification" | "followup" = "forward",
  language: string = "en",
  onEvent: (event: StreamEvent) => void,
  onError: (err: any) => void,
  inputType: "text" | "image" | "audio" | "pdf" = "text"
): Promise<void> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  
  const response = await fetch(`${apiBase}/v1/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      input_text: text,
      input_type: inputType,
      kind,
      language
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body readable");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const chunk of lines) {
      if (!chunk.trim()) continue;
      const dataIndex = chunk.indexOf("data:");
      if (dataIndex !== -1) {
        const rawJson = chunk.slice(dataIndex + 5).trim();
        try {
          const parsed = JSON.parse(rawJson);
          if (parsed.type === "error") {
            onError(new Error(parsed.message || "Pipeline execution failed"));
          } else {
            onEvent(parsed);
          }
        } catch (e) {
          console.warn("Could not parse SSE JSON:", rawJson);
        }
      }
    }
  }
}

export async function transcribeAudioBlob(blob: Blob, language: string = "en"): Promise<string> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const formData = new FormData();
  formData.append("file", blob, "audio.wav");
  formData.append("language", language);

  const res = await fetch(`${apiBase}/v1/transcribe`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    throw new Error(`Transcription failed: ${await res.text()}`);
  }
  const data = await res.json();
  return data.text || "";
}

export async function extractImageText(file: File): Promise<{ text: string; filename: string; status?: string; message?: string }> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${apiBase}/v1/ocr`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OCR extraction failed: ${errText}`);
  }
  return await res.json();
}

export async function extractDocumentText(file: File): Promise<{
  status: string;
  filename: string;
  doc_type: string;
  pages: number;
  word_count: number;
  text: string;
  preview?: string;
  message?: string;
}> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${apiBase}/v1/documents/extract`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Document extraction failed: ${errText}`);
  }
  return await res.json();
}

export async function fetchEnglishSpeech(text: string): Promise<Blob> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const formData = new FormData();
  formData.append("text", text);
  formData.append("language", "en");

  const res = await fetch(`${apiBase}/v1/speak`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    throw new Error(`Speech synthesis failed: ${await res.text()}`);
  }
  return await res.blob();
}

export async function fetchRunData(runId: string) {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/v1/runs/${runId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Could not fetch run");
  return await res.json();
}

export async function fetchRunTrace(runId: string) {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/v1/runs/${runId}/trace`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Could not fetch trace");
  return await res.json();
}

export async function savePublicShareCard(card: any): Promise<boolean> {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/v1/share/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card)
    });
    return res.ok;
  } catch (err) {
    console.warn("[Share] Could not sync share card to cloud:", err);
    return false;
  }
}

export async function fetchPublicShare(shareId: string) {
  const apiBase = getApiBase();
  try {
    const res = await fetch(`${apiBase}/v1/share/${shareId}`);
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 404) {
      throw new Error("Shared verdict card not found");
    }
  } catch (err: any) {
    if (err.message === "Shared verdict card not found") throw err;
    // Retry once after 1.5s in case backend was cold starting
    try {
      await new Promise(r => setTimeout(r, 1500));
      const res2 = await fetch(`${apiBase}/v1/share/${shareId}`);
      if (res2.ok) return await res2.json();
    } catch (e) {}
    throw new Error("Shared verdict card not found");
  }
  throw new Error("Shared verdict card not found");
}

export async function deleteUserHistory(): Promise<{ status: string; message: string }> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/v1/me/history`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to delete history: ${await res.text()}`);
  }
  return await res.json();
}

export async function syncHistoryToCloud(items: any[]): Promise<{ status: string; synced_ids: string[]; synced_count: number }> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/v1/me/sync-history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ items })
  });
  if (!res.ok) {
    throw new Error(`Sync failed: ${await res.text()}`);
  }
  return await res.json();
}

export async function fetchUserHistory(): Promise<{ history: any[]; is_guest: boolean; count?: number }> {
  const token = await getOrCreateSessionToken();
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/v1/me/history`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Could not fetch history: ${await res.text()}`);
  }
  return await res.json();
}
