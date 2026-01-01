export default function createSSE(server, onMessage, onError) {
  const url = `${server.replace(/\/$/, '')}/sse/changes`;
  // EventSource will send cookies for same-origin; for cross-origin ensure CORS and credentials
  const es = new EventSource(url, { withCredentials: true });

  es.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      onMessage && onMessage(payload);
    } catch (err) {
      onError && onError(err);
    }
  };
  es.onerror = (err) => {
    onError && onError(err);
  };
  return es;
}
