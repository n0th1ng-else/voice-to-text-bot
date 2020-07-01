import { randomBytes } from "crypto";

export function randomIntFromInterval(min: number, max: number): number {
  const byteLimit = 256;
  const randomNum = parseInt(randomBytes(1).toString("hex"), 16);
  const normalizedNum = randomNum / byteLimit;
  return Math.floor(normalizedNum * (max - min + 1) + min);
}

export function sleepFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

export function sleepForRandom(): Promise<void> {
  const ms = randomIntFromInterval(100, 3000);
  return sleepFor(ms);
}
