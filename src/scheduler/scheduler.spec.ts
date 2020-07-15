import {
  jest,
  beforeEach,
  it,
  describe,
  expect,
  afterEach,
} from "@jest/globals";
import { nanoid } from "nanoid";
import { ScheduleDaemon } from "./index";
import { WaiterForCalls } from "../../e2e/helpers/waitFor";

jest.mock("../logger");

jest.useFakeTimers("modern");

const oneMinute = 60_000;

let finishResult = Promise.resolve();
const finishWatcher = new WaiterForCalls();
const finishFn = jest.fn<Promise<void>, void[]>().mockImplementation(() => {
  finishWatcher.tick();
  return finishResult;
});

let shouldFinishResult = false;
const shouldFinishWatcher = new WaiterForCalls();
const shouldFinishFn = jest.fn<boolean, string[]>().mockImplementation(() => {
  shouldFinishWatcher.tick();
  return shouldFinishResult;
});

let tickResult = Promise.resolve("");
const tickWatcher = new WaiterForCalls();
const tickFn = jest.fn<Promise<string>, void[]>().mockImplementation(() => {
  tickWatcher.tick();
  return tickResult;
});

let testId = nanoid(10);
let scheduler = new ScheduleDaemon<string>(testId, () =>
  Promise.reject(new Error("not set"))
);

describe("Scheduler", () => {
  beforeEach(() => {
    finishResult = Promise.resolve();
    testId = nanoid(10);
    scheduler = new ScheduleDaemon<string>(testId, tickFn);
  });

  afterEach(() => {
    tickFn.mockClear();
    shouldFinishFn.mockClear();
    finishFn.mockClear();
    tickWatcher.reset();
    shouldFinishWatcher.reset();
    finishWatcher.reset();
  });

  it("is not running after init", () => {
    expect(scheduler.isRunning).toBe(false);
    expect(tickFn).not.toBeCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("will run tick immediately after start", () => {
    scheduler.start();
    expect(jest.getTimerCount()).toBe(1);
    expect(scheduler.isRunning).toBe(true);
    expect(tickFn).toBeCalledTimes(1);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
  });

  it("can start only once", () => {
    scheduler.start();
    expect(jest.getTimerCount()).toBe(1);
    expect(scheduler.isRunning).toBe(true);
    expect(tickFn).toBeCalledTimes(1);
    scheduler.start();
    expect(scheduler.isRunning).toBe(true);
    expect(tickFn).toBeCalledTimes(1);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
  });

  it("stops on stop command", () => {
    scheduler.start();
    expect(jest.getTimerCount()).toBe(1);
    expect(scheduler.isRunning).toBe(true);
    expect(tickFn).toBeCalledTimes(1);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stop twice does nothing", () => {
    scheduler.start();
    expect(jest.getTimerCount()).toBe(1);
    expect(scheduler.isRunning).toBe(true);
    expect(tickFn).toBeCalledTimes(1);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  describe("without finish", () => {
    afterEach(() => {
      scheduler.stop();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("will run tick every single minute", () => {
      const offset = 1;
      scheduler.start();
      jest.advanceTimersByTime(offset * oneMinute);
      expect(tickFn).toBeCalledTimes(offset + 1);
    });

    it("never stops ticking", () => {
      const offset = 100;
      scheduler.start();
      jest.advanceTimersByTime(offset * oneMinute);
      expect(tickFn).toBeCalledTimes(offset + 1);
    });

    it("never ever stops ticking", () => {
      const offset = 100000;
      scheduler.start();
      jest.advanceTimersByTime(offset * oneMinute);
      expect(tickFn).toBeCalledTimes(offset + 1);
    });

    it("does not stop event if the tick threw an error after init", () => {
      tickResult = Promise.reject(new Error("Oopsie"));
      const offset = 1;
      scheduler.start();
      expect(tickFn).toBeCalledTimes(1);
      jest.advanceTimersByTime(offset * oneMinute);
      expect(tickFn).toBeCalledTimes(offset + 1);
    });

    it("does not stop event if the tick throw errors all the time", () => {
      tickResult = Promise.reject(new Error("Oopsie"));
      const offset = 100;
      scheduler.start();
      expect(tickFn).toBeCalledTimes(1);
      jest.advanceTimersByTime(offset * oneMinute);
      expect(tickFn).toBeCalledTimes(offset + 1);
    });
  });

  describe("with finish", () => {
    beforeEach(() => {
      tickResult = Promise.resolve("");
      shouldFinishResult = false;
      scheduler.setStopHandler(shouldFinishFn, finishFn);
    });

    it("tick, shouldFinish called on init. finish never called with shouldFinish=false", () => {
      tickWatcher.reset(1);
      shouldFinishWatcher.reset(1);
      scheduler.start();

      return Promise.all([
        tickWatcher.waitForCondition(),
        shouldFinishWatcher.waitForCondition(),
      ]).then(() => {
        expect(jest.getTimerCount()).toBe(1);
        expect(scheduler.isRunning).toBe(true);
        expect(tickFn).toBeCalledTimes(1);
        expect(shouldFinishFn).toBeCalledTimes(1);
        expect(finishFn).toBeCalledTimes(0);
        scheduler.stop();
      });
    });

    it("tick, shouldFinish called every time. finish never called with shouldFinish=false", () => {
      const offset = 100;
      tickWatcher.reset(offset);
      shouldFinishWatcher.reset(offset);
      scheduler.start();
      jest.advanceTimersByTime(offset * oneMinute);
      return Promise.all([
        tickWatcher.waitForCondition(),
        shouldFinishWatcher.waitForCondition(),
      ]).then(() => {
        expect(jest.getTimerCount()).toBe(1);
        expect(scheduler.isRunning).toBe(true);
        expect(tickFn).toBeCalledTimes(offset + 1);
        expect(shouldFinishFn).toBeCalledTimes(offset + 1);
        expect(finishFn).toBeCalledTimes(0);
        scheduler.stop();
      });
    });

    it("tick, shouldFinish and finish called if shouldFinish=true. daemon stops", () => {
      tickWatcher.reset(1);
      shouldFinishWatcher.reset(1);
      finishWatcher.reset(1);
      scheduler.start();
      shouldFinishResult = true;
      return Promise.all([
        tickWatcher.waitForCondition(),
        shouldFinishWatcher.waitForCondition(),
        finishWatcher.waitForCondition(),
      ]).then(() => {
        expect(jest.getTimerCount()).toBe(0);
        expect(scheduler.isRunning).toBe(false);
        expect(tickFn).toBeCalledTimes(1);
        expect(shouldFinishFn).toBeCalledTimes(1);
        expect(finishFn).toBeCalledTimes(1);
      });
    });

    it("tick, shouldFinish and finish called until shouldFinish=true. then daemon stops", () => {
      tickWatcher.reset(1);
      shouldFinishWatcher.reset(1);
      scheduler.start();
      shouldFinishResult = false;

      return Promise.all([
        tickWatcher.waitForCondition(),
        shouldFinishWatcher.waitForCondition(),
      ])
        .then(() => {
          expect(jest.getTimerCount()).toBe(1);
          expect(scheduler.isRunning).toBe(true);
          expect(tickFn).toBeCalledTimes(1);
          expect(shouldFinishFn).toBeCalledTimes(1);
          expect(finishFn).toBeCalledTimes(0);

          tickWatcher.reset(1);
          shouldFinishWatcher.reset(1);
          finishWatcher.reset(1);
          shouldFinishResult = true;
          jest.advanceTimersByTime(oneMinute);
          return Promise.all([
            tickWatcher.waitForCondition(),
            shouldFinishWatcher.waitForCondition(),
            finishWatcher.waitForCondition(),
          ]);
        })
        .then(() => {
          expect(jest.getTimerCount()).toBe(0);
          expect(scheduler.isRunning).toBe(false);
          expect(tickFn).toBeCalledTimes(2);
          expect(shouldFinishFn).toBeCalledTimes(2);
          expect(finishFn).toBeCalledTimes(1);
        });
    });

    it("can stop only if tick results with no errors", () => {
      tickWatcher.reset(1);

      tickResult = Promise.reject(new Error("That was bad"));
      shouldFinishResult = true;

      scheduler.start();

      return tickWatcher
        .waitForCondition()
        .then(() => {
          expect(jest.getTimerCount()).toBe(1);
          expect(scheduler.isRunning).toBe(true);
          expect(tickFn).toBeCalledTimes(1);
          expect(shouldFinishFn).toBeCalledTimes(0);
          expect(finishFn).toBeCalledTimes(0);

          tickWatcher.reset(1);

          jest.advanceTimersByTime(oneMinute);
          return tickWatcher.waitForCondition();
        })
        .then(() => {
          expect(scheduler.isRunning).toBe(true);
          expect(tickFn).toBeCalledTimes(2);
          expect(shouldFinishFn).toBeCalledTimes(0);
          expect(finishFn).toBeCalledTimes(0);

          tickWatcher.reset(1);
          shouldFinishWatcher.reset(1);
          finishWatcher.reset(1);

          tickResult = Promise.resolve("woah");

          jest.advanceTimersByTime(oneMinute);

          return Promise.all([
            tickWatcher.waitForCondition(),
            shouldFinishWatcher.waitForCondition(),
            finishWatcher.waitForCondition(),
          ]);
        })
        .then(() => {
          expect(jest.getTimerCount()).toBe(0);
          expect(scheduler.isRunning).toBe(false);
          expect(tickFn).toBeCalledTimes(3);
          expect(shouldFinishFn).toBeCalledTimes(1);
          expect(finishFn).toBeCalledTimes(1);
        });
    });

    it("can stop only if finish results with no errors", () => {
      tickWatcher.reset(1);
      shouldFinishWatcher.reset(1);
      finishWatcher.reset(1);

      finishResult = Promise.reject(new Error("That was bad"));
      shouldFinishResult = true;

      scheduler.start();

      return Promise.all([
        tickWatcher.waitForCondition(),
        shouldFinishWatcher.waitForCondition(),
        finishWatcher.waitForCondition(),
      ])
        .then(() => {
          expect(jest.getTimerCount()).toBe(1);
          expect(scheduler.isRunning).toBe(true);
          expect(tickFn).toBeCalledTimes(1);
          expect(shouldFinishFn).toBeCalledTimes(1);
          expect(finishFn).toBeCalledTimes(1);

          tickWatcher.reset(1);
          shouldFinishWatcher.reset(1);
          finishWatcher.reset(1);

          jest.advanceTimersByTime(oneMinute);
          return Promise.all([
            tickWatcher.waitForCondition(),
            shouldFinishWatcher.waitForCondition(),
            finishWatcher.waitForCondition(),
          ]);
        })
        .then(() => {
          expect(scheduler.isRunning).toBe(true);
          expect(tickFn).toBeCalledTimes(2);
          expect(shouldFinishFn).toBeCalledTimes(2);
          expect(finishFn).toBeCalledTimes(2);

          tickWatcher.reset(1);
          shouldFinishWatcher.reset(1);
          finishWatcher.reset(1);

          finishResult = Promise.resolve();

          jest.advanceTimersByTime(oneMinute);

          return Promise.all([
            tickWatcher.waitForCondition(),
            shouldFinishWatcher.waitForCondition(),
            finishWatcher.waitForCondition(),
          ]);
        })
        .then(() => {
          expect(jest.getTimerCount()).toBe(0);
          expect(scheduler.isRunning).toBe(false);
          expect(tickFn).toBeCalledTimes(3);
          expect(shouldFinishFn).toBeCalledTimes(3);
          expect(finishFn).toBeCalledTimes(3);
        });
    });
  });
});
