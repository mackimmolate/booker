interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  release(): Promise<void>;
  onrelease: ((this: WakeLockSentinel, event: Event) => void) | null;
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface Navigator {
  readonly wakeLock?: WakeLock;
}
