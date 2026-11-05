// Preserve server errors, but never show HTML/proxy bodies or raw responses to users.
export async function readApiResponse(response) {
  const text = await response.text();
  const connectionHint = 'Check that Flask is running on port 5000, then retry.';
  if (!text.trim()) {
    throw new Error(`The API returned an empty response (HTTP ${response.status}). ${connectionHint}`);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`The API returned an unreadable response (HTTP ${response.status}). ${connectionHint}`);
  }
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (HTTP ${response.status}). Please check the backend terminal.`);
  }
  return body;
}
