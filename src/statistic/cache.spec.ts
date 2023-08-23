import { expect, describe, it, jest, beforeAll } from "@jest/globals";
import { injectDependencies, InjectedFn } from "../testUtils/dependencies.js";

jest.unstable_mockModule(
  "../logger/index",
  () => import("../logger/__mocks__/index.js"),
);

type TestCacheData = {
  testId: string;
  testData: string;
};

const testId = "some-id-1";
const testData = "some-test-data";
const item: TestCacheData = { testId, testData };

const testId2 = "some-id-2";
const testData2 = "some-test-data-2";
const item2: TestCacheData = { testId: testId2, testData: testData2 };

const testId3 = "some-id-3";
const testData3 = "some-test-data-3";
const item3: TestCacheData = { testId: testId3, testData: testData3 };

let cacheSize = 0;
let CacheProvider: Awaited<typeof import("./cache.js").CacheProvider>;
let cache: InstanceType<InjectedFn["CacheProvider"]>;

describe("[cache]", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    CacheProvider = init.CacheProvider;
  });

  it("does nothing when cache size is 0", () => {
    cacheSize = 0;
    cache = new CacheProvider<TestCacheData, "testId">(cacheSize, "testId");

    expect(cache.getCacheSize()).toBe(0);

    cache.addItem(item);
    expect(cache.getCacheSize()).toBe(0);

    const cacheItem = cache.getItem(testId);
    expect(cacheItem).toBe(null);
    expect(cache.getCacheSize()).toBe(0);

    cache.removeItem(testId);
    expect(cache.getCacheSize()).toBe(0);
  });

  it("works with cache size 1", () => {
    cacheSize = 1;
    cache = new CacheProvider<TestCacheData, "testId">(cacheSize, "testId");

    expect(cache.getCacheSize()).toBe(0);

    cache.addItem(item);
    expect(cache.getCacheSize()).toBe(1);

    const cacheItem1 = cache.getItem(testId);
    expect(cacheItem1).toBeDefined();

    if (!cacheItem1) {
      throw new Error("item expect to be defined");
    }
    expect(cacheItem1.testId).toBe(testId);
    expect(cacheItem1.testData).toBe(testData);
    expect(cache.getCacheSize()).toBe(1);

    cache.removeItem(testId);
    expect(cache.getCacheSize()).toBe(0);

    const cacheItem2 = cache.getItem(testId);
    expect(cacheItem2).toBe(null);
  });

  it("access to the cached item multiple times does not remove the item", () => {
    cacheSize = 1;
    cache = new CacheProvider<TestCacheData, "testId">(cacheSize, "testId");

    expect(cache.getCacheSize()).toBe(0);

    cache.addItem(item);
    expect(cache.getCacheSize()).toBe(1);

    new Array(1000).fill(null).forEach(() => {
      const cacheItem = cache.getItem(testId);
      expect(cacheItem).toBeDefined();

      if (!cacheItem) {
        throw new Error("item expect to be defined");
      }
      expect(cacheItem.testId).toBe(testId);
      expect(cacheItem.testData).toBe(testData);
      expect(cache.getCacheSize()).toBe(1);
    });
  });

  it("can not put the item with empty id", () => {
    cacheSize = 1;
    cache = new CacheProvider<TestCacheData, "testId">(cacheSize, "testId");

    expect(cache.getCacheSize()).toBe(0);

    const item3: TestCacheData = { testId: "", testData };
    cache.addItem(item3);

    expect(cache.getCacheSize()).toBe(0);
  });

  it("removes old cache record and puts a new one if the id is the same", () => {
    cacheSize = 20;
    cache = new CacheProvider<TestCacheData, "testId">(cacheSize, "testId");

    expect(cache.getCacheSize()).toBe(0);

    cache.addItem(item);
    cache.addItem(item2);

    const item3: TestCacheData = { testId, testData: testData3 };
    cache.addItem(item3);

    expect(cache.getCacheSize()).toBe(2);
    const cacheItem = cache.getItem(testId);
    expect(cacheItem).toBeDefined();

    if (!cacheItem) {
      throw new Error("item expect to be defined");
    }
    expect(cacheItem.testId).toBe(testId);
    expect(cacheItem.testData).toBe(testData3);
    expect(cache.getCacheSize()).toBe(2);
  });

  it("removes old record is cache size reaches limit", () => {
    cacheSize = 2;
    cache = new CacheProvider<TestCacheData, "testId">(cacheSize, "testId");

    expect(cache.getCacheSize()).toBe(0);

    cache.addItem(item);
    cache.addItem(item2);
    expect(cache.getCacheSize()).toBe(2);

    cache.addItem(item3);
    expect(cache.getCacheSize()).toBe(2);

    const itm1 = cache.getItem(testId);
    const itm2 = cache.getItem(testId2);
    const itm3 = cache.getItem(testId3);

    expect(itm1).toBe(null);

    if (!itm2) {
      throw new Error("item expect to be defined");
    }
    expect(itm2.testId).toBe(testId2);
    expect(itm2.testData).toBe(testData2);

    if (!itm3) {
      throw new Error("item expect to be defined");
    }
    expect(itm3.testId).toBe(testId3);
    expect(itm3.testData).toBe(testData3);
  });
});
