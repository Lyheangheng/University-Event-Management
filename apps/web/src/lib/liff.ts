'use client';

export interface LiffState {
  isConfigured: boolean;
  isReady: boolean;
  isInClient: boolean;
  isLoggedIn: boolean;
  idToken: string | null;
  error: string | null;
}

let liffInstance: typeof import('@line/liff').default | null = null;

/**
 * Initializes LINE Front-end Framework (LIFF) SDK cleanly
 */
export async function initLiff(): Promise<LiffState> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

  if (typeof window === 'undefined') {
    return {
      isConfigured: false,
      isReady: false,
      isInClient: false,
      isLoggedIn: false,
      idToken: null,
      error: 'LIFF cannot run in Server Side Rendering environment',
    };
  }

  if (!liffId || !liffId.trim()) {
    return {
      isConfigured: false,
      isReady: true,
      isInClient: false,
      isLoggedIn: false,
      idToken: null,
      error: 'NEXT_PUBLIC_LIFF_ID is unconfigured',
    };
  }

  try {
    const liffModule = await import('@line/liff');
    liffInstance = liffModule.default;

    await liffInstance.init({ liffId: liffId.trim() });

    const isLoggedIn = liffInstance.isLoggedIn();
    let idToken: string | null = null;

    if (isLoggedIn) {
      idToken = liffInstance.getIDToken();
    }

    return {
      isConfigured: true,
      isReady: true,
      isInClient: liffInstance.isInClient(),
      isLoggedIn,
      idToken,
      error: null,
    };
  } catch (err: any) {
    console.warn('LIFF Initialization warning/error:', err);
    return {
      isConfigured: Boolean(liffId),
      isReady: true,
      isInClient: false,
      isLoggedIn: false,
      idToken: null,
      error: err?.message || 'Failed to initialize LIFF SDK',
    };
  }
}

/**
 * Trigger LINE Login via LIFF SDK
 */
export async function triggerLiffLogin(): Promise<void> {
  if (liffInstance && typeof window !== 'undefined') {
    if (!liffInstance.isLoggedIn()) {
      liffInstance.login();
    }
  }
}

/**
 * Get active LIFF ID Token
 */
export function getActiveLiffIdToken(): string | null {
  if (liffInstance && liffInstance.isLoggedIn()) {
    return liffInstance.getIDToken();
  }
  return null;
}
