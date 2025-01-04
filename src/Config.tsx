export const apiConfig = {
  host: () => logseq.settings?.host || "localhost",
  apiKey: () => logseq.settings?.apiKey || "",
  model: () => logseq.settings?.model || "default-model",
};

export function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiConfig.apiKey()) {
    headers["Authorization"] = `Bearer ${apiConfig.apiKey()}`;
  }
  return headers;
}
