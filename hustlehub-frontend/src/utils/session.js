// Inactivity auto-logout settings (an extra security feature - it is not required by the brief).
// If nobody touches the page for INACTIVITY_LIMIT_MS the person is signed out, which protects a shared or
// unattended computer. A warning with a "Stay signed in" button appears WARNING_MS before that happens.

export const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
export const WARNING_MS = 60 * 1000;
export const INACTIVITY_MESSAGE = 'You were signed out because you were inactive for a while. Please log in again.';

// Events that count as "the person is still here".
export const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
