import { useEffect, useRef, useState } from 'react';

// Resources/useConnectionStatus.js
//
// Derives a single trustworthy "are we actually able to reach the server right
// now" signal, combining:
//   - the existing SSE connection state (fast to update, but SSE being open
//     doesn't guarantee a specific POST will succeed)
//   - navigator.onLine (fast, but only reflects the OS network interface, not
//     whether our server is actually reachable)
//   - a lightweight periodic /health ping, only while SSE is NOT connected
//     (avoids extra load once the fast/cheap SSE signal already tells us we're fine)
//
// This does not change any existing behavior on its own — it's a read-only
// signal. Phase 5 wires isFullyConnected into actually gating Tier B postings.

const HEALTH_PING_INTERVAL_MS = 20000;
const HEALTH_PING_TIMEOUT_MS = 6000;

export function useConnectionStatus(server, isSSEConnected) {
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isHealthPingOk, setIsHealthPingOk] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pingOnce = async () => {
      if (!isBrowserOnline || !server) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_PING_TIMEOUT_MS);
      try {
        const resp = await fetch(`${server}/health`, { method: 'GET', signal: controller.signal });
        if (!cancelled) setIsHealthPingOk(resp.ok);
      } catch (e) {
        if (!cancelled) setIsHealthPingOk(false);
      } finally {
        clearTimeout(timeout);
      }
    };

    // Only bother polling /health when SSE isn't already telling us we're connected.
    if (!isSSEConnected) {
      pingOnce();
      timerRef.current = setInterval(pingOnce, HEALTH_PING_INTERVAL_MS);
    } else {
      setIsHealthPingOk(true);
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSSEConnected, isBrowserOnline, server]);

  const isFullyConnected = isBrowserOnline && (isSSEConnected || isHealthPingOk);

  return { isFullyConnected, isBrowserOnline };
}
