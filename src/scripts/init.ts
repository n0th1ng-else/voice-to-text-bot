export const getLaunchDelay = (threadId: number): number =>
  threadId ? (threadId - 1) * 10_000 : 0;
