import { Logger } from "../logger";
import { sSuffix } from "../text";

const logger = new Logger("cache");

export class CacheProvider<Data, UniqId extends keyof Data> {
  private cache: Data[] = [];

  constructor(
    private readonly cacheSize: number,
    private readonly idKey: UniqId
  ) {
    if (!this.hasCacheEnabled()) {
      logger.warn(
        `Cache size is ${logger.y(
          sSuffix("item", cacheSize)
        )}, so the cache is ${logger.r("turned off")} for ${logger.y(
          String(idKey)
        )} stat`
      );
    } else {
      logger.warn(
        `Cache size is ${logger.y(
          sSuffix("item", cacheSize)
        )} initialized for ${logger.y(String(idKey))} stat`
      );
    }
  }

  public addItem(item: Data): void {
    if (!this.hasCacheEnabled()) {
      return;
    }

    if (!item[this.idKey]) {
      logger.error(
        `The item with ${this.idKey}=${
          item[this.idKey]
        } can not have empty index value. Caching skipped`,
        new Error("Cache item can not have empty index value")
      );
      return;
    }

    const existingItem = this.cache.find(
      (cItem) => cItem[this.idKey] === item[this.idKey]
    );
    if (existingItem) {
      logger.warn(
        `The item with ${this.idKey}=${
          item[this.idKey]
        } is already exists. Removing old data from the cache`
      );

      this.removeItem(item[this.idKey]);
    }

    const newCacheData = [...this.cache, item];

    if (newCacheData.length > this.cacheSize) {
      logger.warn(
        `Cache storage exceeds the limit of ${logger.y(
          sSuffix("item", this.cacheSize)
        )} and have a size of ${logger.y(
          sSuffix("item", newCacheData.length)
        )}. Old records will be removed to keep storage under the limit`
      );
    }

    this.cache = newCacheData.slice(
      Math.max(newCacheData.length - this.cacheSize, 0)
    );

    logger.info(
      `Added cache item with ${this.idKey}=${item[this.idKey]}. Cache size=${
        this.cache.length
      }`
    );
  }

  public getItem(idValue: Data[UniqId]): Data | null {
    if (!this.hasCacheEnabled()) {
      return null;
    }

    const cachedItem = this.cache.find(
      (cItem) => cItem[this.idKey] === idValue
    );

    if (!cachedItem) {
      logger.info(
        `Did not find the item with ${this.idKey}=${idValue} in cache`
      );
      return null;
    }

    logger.info(
      `Found the item with ${this.idKey}=${idValue} in cache. Skipping DB request`
    );
    return cachedItem;
  }

  public removeItem(idValue: Data[UniqId]): void {
    if (!this.hasCacheEnabled()) {
      return;
    }

    this.cache = this.cache.filter((cItem) => cItem[this.idKey] !== idValue);

    logger.info(
      `Removed cache item for ${this.idKey}=${idValue}. Cache size=${this.cache.length}`
    );
  }

  private hasCacheEnabled(): boolean {
    return this.cacheSize > 0;
  }
}
