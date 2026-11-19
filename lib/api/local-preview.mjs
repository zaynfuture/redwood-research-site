const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/** @param {Request} request */
export function isLocalPreview(request) {
  return process.env.REDWOOD_LOCAL_PREVIEW === '1' && loopbackHosts.has(new URL(request.url).hostname);
}
