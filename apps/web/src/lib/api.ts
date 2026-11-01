import { getOrCreateSessionToken } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  
  const response = await fetch(`${API_BASE}/v1/runs`, {
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
          onEvent(parsed);
        } catch (e) {
          console.warn("Could not parse SSE JSON:", rawJson);
        }
      }
    }
  }
}

export async function transcribeAudioBlob(blob: Blob, language: string = "en"): Promise<string> {
  const token = await getOrCreateSessionToken();
  const formData = new FormData();
  formData.append("file", blob, "audio.wav");
  formData.append("language", language);

  const res = await fetch(`${API_BASE}/v1/transcribe`, {
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
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/v1/ocr`, {
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

export async function fetchEnglishSpeech(text: string): Promise<Blob> {
  const token = await getOrCreateSessionToken();
  const formData = new FormData();
  formData.append("text", text);
  formData.append("language", "en");

  const res = await fetch(`${API_BASE}/v1/speak`, {
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
  const res = await fetch(`${API_BASE}/v1/runs/${runId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Could not fetch run");
  return await res.json();
}

export async function fetchRunTrace(runId: string) {
  const token = await getOrCreateSessionToken();
  const res = await fetch(`${API_BASE}/v1/runs/${runId}/trace`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Could not fetch trace");
  return await res.json();
}

export async function fetchPublicShare(shareId: string) {
  const res = await fetch(`${API_BASE}/v1/share/${shareId}`);
  if (!res.ok) throw new Error("Shared verdict card not found");
  return await res.json();
}

export async function deleteUserHistory(): Promise<{ status: string; message: string }> {
  const token = await getOrCreateSessionToken();
  const res = await fetch(`${API_BASE}/v1/me/history`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to delete history: ${await res.text()}`);
  }
  return await res.json();
}
