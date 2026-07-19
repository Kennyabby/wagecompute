// Resources/postingOperations.js
//
// Shared helpers for the accounting posting-progress/resumability system
// (wageserver's PostingOperations collection + SSE feed). Any page that
// posts a double-entry record (Purchase, Inventory, Assets, BusinessPartners
// today) can use these instead of duplicating the pattern:
//
// 1. generateOperationId() before the POST, so the server can track/broadcast
//    progress under a stable id the caller already knows.
// 2. postWithResumability(...) instead of a bare fetchServer(...) call — if
//    the connection drops mid-request, it asks the server "did this actually
//    finish?" instead of assuming failure. The underlying route's
//    clientTxnId dedup already makes a genuine retry harmless either way;
//    this just gives the UI a fast, correct answer instead of "shrug, try
//    again".
// 3. usePostingOperationProgress(operationId) to render live progress — fed
//    by App.js's SSE switch dispatching `wc:posting-progress-update` for the
//    'PostingOperations' collection, the same window.CustomEvent fan-out
//    pattern already used for `wc:accounting-live-update` /
//    `wc:dashboard-summary-update`.

import { useEffect, useState } from 'react';
import fetchServer from './ClientServerAPIConn/fetchServer';
import { generateClientTxnId } from './clientTxnId';

export const generateOperationId = () => generateClientTxnId();

const looksLikeNetworkFailure = (result) => !!result?.err
  && !result?.status
  && /could not connect|network|aborted/i.test(result?.mess || '');

/**
 * POSTs a body with a generated operationId attached. On a genuine network
 * failure (not a server-side rejection), checks postingOperationStatus
 * before giving up — 'completed'/'failed' means the server already resolved
 * it (don't blindly retry), 'in-progress'/'unknown' surfaces the original
 * error so the caller can decide whether to wait or retry.
 */
export const postWithResumability = async (body, endpoint, server) => {
  const operationId = generateOperationId();
  const result = await fetchServer('POST', { ...body, operationId }, endpoint, server);

  if (looksLikeNetworkFailure(result)) {
    const statusResp = await fetchServer('POST', { operationId }, 'accounting/postingOperationStatus', server).catch(() => null);
    if (statusResp?.ok && (statusResp.status === 'completed' || statusResp.status === 'failed')) {
      return { ...statusResp, resumedFromStatusCheck: true, operationId };
    }
  }
  return { ...result, operationId };
};

/** One-off status check — used to reattach to an in-progress operation (e.g. the backlog run) after a page reload. */
export const checkPostingOperationStatus = async (operationId, server) => {
  if (!operationId) return null;
  const resp = await fetchServer('POST', { operationId }, 'accounting/postingOperationStatus', server).catch(() => null);
  return resp?.ok ? resp : null;
};

/** Live progress for one operationId, fed by the SSE 'PostingOperations' feed App.js re-dispatches as `wc:posting-progress-update`. */
export const usePostingOperationProgress = (operationId) => {
  const [operation, setOperation] = useState(null);

  useEffect(() => {
    if (!operationId) {
      setOperation(null);
      return undefined;
    }
    const handler = (event) => {
      const data = event?.detail;
      if (data?._id === operationId) setOperation(data);
    };
    window.addEventListener('wc:posting-progress-update', handler);
    return () => window.removeEventListener('wc:posting-progress-update', handler);
  }, [operationId]);

  return operation;
};
