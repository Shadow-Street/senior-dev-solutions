import apiClient from "../lib/apiClient";

/**
 * Upload a file to the backend.
 * Expected backend endpoint: POST /files/upload (multipart/form-data)
 * Returns: { file_url: string, ... }
 */
export async function UploadFile({ file, ...extra } = {}) {
  if (!file) {
    throw new Error("UploadFile: 'file' is required");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Pass through any extra fields for backend to use (e.g., folder, is_private)
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await apiClient.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

/**
 * Send an email via backend.
 * Expected backend endpoint: POST /emails/send
 */
export async function SendEmail({ to, subject, body, ...rest }) {
  if (!to || !subject || !body) {
    throw new Error("SendEmail: 'to', 'subject' and 'body' are required");
  }

  const response = await apiClient.post("/emails/send", {
    to,
    subject,
    body,
    ...rest,
  });

  return response.data;
}

// Optional wrappers for legacy integration-style APIs. Implement the
// corresponding endpoints in your backend to make these fully functional.

export async function InvokeLLM(payload) {
  const response = await apiClient.post("/ai/invoke", payload);
  return response.data;
}

export async function GenerateImage(payload) {
  const response = await apiClient.post("/ai/generate-image", payload);
  return response.data;
}

export async function ExtractDataFromUploadedFile(payload) {
  const response = await apiClient.post("/files/extract-data", payload);
  return response.data;
}

export async function CreateFileSignedUrl(payload) {
  const response = await apiClient.post("/files/create-signed-url", payload);
  return response.data;
}

export async function UploadPrivateFile({ file, ...extra } = {}) {
  return UploadFile({ file, is_private: true, ...extra });
}

// Core-like object for backwards compatibility with older code patterns.
export const Core = {
  UploadFile,
  SendEmail,
  InvokeLLM,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile,
};

