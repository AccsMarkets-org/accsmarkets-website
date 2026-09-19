// Bridge helpers for the native WebView apps (iOS/Android AccsMarketsApp).
// The shell injects window.ReactNativeWebView; on the plain website these are no-ops.

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

// Tell the native shell the user signed out, so it can drop its stored session
// artifacts and reload cleanly. Without this, iOS's shared cookie store can
// resurrect the deleted session cookie and sign-out appears to "not work".
export function notifyNativeLogout(): void {
  try {
    (window as unknown as { ReactNativeWebView?: { postMessage(msg: string): void } })
      .ReactNativeWebView?.postMessage(JSON.stringify({ type: "LOGOUT" }));
  } catch {
    // never let the bridge break web logout
  }
}
