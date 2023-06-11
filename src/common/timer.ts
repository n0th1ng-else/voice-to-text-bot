import { randomBytes } from "node:crypto";

export const randomIntFromInterval = (min: number, max: number): number => {
  const byteLimit = 256;
  const randomNum = parseInt(randomBytes(1).toString("hex"), 16);
  const normalizedNum = randomNum / byteLimit;
  return Math.floor(normalizedNum * (max - min + 1) + min);
};

export const sleepFor = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(() => resolve(), ms));

export const sleepForRandom = (): Promise<void> => {
  const ms = randomIntFromInterval(100, 3000);
  return sleepFor(ms);
};

export const getLaunchDelay = (threadId: number): number => {
  return threadId ? (threadId - 1) * 10_000 : 0;
};

export class TimeMeasure {
  private readonly start: [number, number];

  constructor() {
    this.start = process.hrtime();
  }

  public getMs(): number {
    const [sec, nanosec] = process.hrtime(this.start);
    const nanoseconds = sec * 1e9 + nanosec;
    const milliseconds = nanoseconds / 1e6;
    return Math.ceil(milliseconds);
  }
}
