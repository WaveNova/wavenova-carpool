export type NotificationPayload = {
  title: string;
  content: string;
};

// Push notifications were previously sent via Manus. Stub returns false so
// callers degrade gracefully. Wire up Resend/email here when needed.
export async function notifyOwner(
  _payload: NotificationPayload
): Promise<boolean> {
  return false;
}
