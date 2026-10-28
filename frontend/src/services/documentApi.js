const API_BASE = '/api';
const OWNER_STORAGE_KEY = 'dms-owner-id';
let temporaryOwnerId;

function createOwnerId() {
  if (window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getOwnerId() {
  try {
    let ownerId = window.localStorage.getItem(OWNER_STORAGE_KEY);

    if (!ownerId) {
      ownerId = createOwnerId();
      window.localStorage.setItem(OWNER_STORAGE_KEY, ownerId);
    }

    return ownerId;
  } catch {
    temporaryOwnerId ||= createOwnerId();
    return temporaryOwnerId;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'X-User-Id': getOwnerId(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message || `A solicitação falhou (${response.status}).`,
    );
  }

  return response;
}

export async function listDocuments() {
  const response = await request('/documents');
  return response.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

export async function downloadDocument(documentId, originalName) {
  const downloadName =
    originalName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'document';
  let downloadResponse;

  if (
    window.isSecureContext &&
    typeof window.showSaveFilePicker === 'function'
  ) {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: downloadName,
    });
    downloadResponse = await request(
      `/documents/${encodeURIComponent(documentId)}/download`,
    );

    if (downloadResponse.body) {
      const writable = await fileHandle.createWritable();
      await downloadResponse.body.pipeTo(writable);
      return;
    }
  }

  downloadResponse ||= await request(
    `/documents/${encodeURIComponent(documentId)}/download`,
  );
  const objectUrl = URL.createObjectURL(await downloadResponse.blob());
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = downloadName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}