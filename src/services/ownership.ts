/** Hold a Web Lock for the lifetime of the owner tab. Waiting tabs acquire it on release. */
export function claimOwnership(
  acquired: () => void,
  unavailable: () => void,
): () => void {
  if (!navigator.locks) {
    unavailable()
    return () => {}
  }
  const abort = new AbortController()
  let release: (() => void) | undefined
  let cancelled = false
  void navigator.locks
    .request('posture-buddy:writer', { signal: abort.signal }, async () => {
      if (cancelled) return
      await new Promise<void>((resolve) => {
        release = resolve
        acquired()
      })
    })
    .catch((error) => {
      if (!cancelled && error.name !== 'AbortError') unavailable()
    })
  return () => {
    cancelled = true
    abort.abort()
    release?.()
  }
}
