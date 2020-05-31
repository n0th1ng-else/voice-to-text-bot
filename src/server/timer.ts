function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function sleepFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

export function sleepForRandom(): Promise<void> {
  const ms = randomIntFromInterval(100, 3000);
  return sleepFor(ms);
}
