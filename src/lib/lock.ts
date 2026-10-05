const tails = new Map<string, Promise<void>>();

/** Serialises async work per session (single-process only). */
export async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(sessionId) ?? Promise.resolve();
  let release: () => void = () => {};
  const mine = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = prev.then(() => mine);
  tails.set(sessionId, tail);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(sessionId) === tail) tails.delete(sessionId);
  }
}
