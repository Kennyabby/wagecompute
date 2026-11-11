// What this device says about itself, sent with a sign-in and with the
// POS's sync reports, so the server can tell a phone from a till and the
// desktop app from a browser. The server reads the user agent as well;
// these fill in what it cannot see, such as the screen size.

export const deviceHints = () => {
  try {
    const data = typeof navigator !== 'undefined' ? navigator.userAgentData : null
    const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    const width = typeof window !== 'undefined' ? window.screen?.width || 0 : 0
    const height = typeof window !== 'undefined' ? window.screen?.height || 0 : 0
    return {
      // A touch screen narrower than a small laptop counts as mobile when
      // the browser does not say.
      mobile: typeof data?.mobile === 'boolean' ? data.mobile : (coarse && Math.min(width, height) > 0 && Math.min(width, height) < 820),
      platform: data?.platform || '',
      screen: width && height ? `${width}x${height}` : '',
      app: typeof window !== 'undefined' && window.electronAPI?.isElectron ? 'desktop' : 'browser',
    }
  } catch (e) {
    return {}
  }
}
