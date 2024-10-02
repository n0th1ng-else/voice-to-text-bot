import { expect } from "@jest/globals";
import type { LanguageCode } from "../../../src/recognition/types.js";
import { BotStatRecordModel } from "../../helpers.js";
import { randomIntFromInterval } from "../../../src/common/timer.js";
import { Pool as MockPool } from "../../../src/db/__mocks__/pg.js";
import { UsagesSql } from "../../../src/db/sql/usages.sql.js";
import { UsageRowScheme } from "../../../src/db/sql/usages.js";

export const mockGetBotStatItem = (
  pool: MockPool,
  chatId: number,
  lang: LanguageCode,
  item?: BotStatRecordModel,
): BotStatRecordModel => {
  if (!item) {
    mockBotStatFind(pool, chatId);
    const stat = mockBotStatCreate(pool, chatId, "", lang);
    return stat;
  }

  mockBotStatFind(pool, chatId, [item]);
  return item;
};

export const mockUpdateBotStatUsage = (
  pool: MockPool,
  item: BotStatRecordModel,
): Promise<void> => {
  mockBotStatFind(pool, item.chatId, [item]);
  return mockBotStatUpdateUsage(pool, item);
};

export const mockUpdateBotStatLang = (
  pool: MockPool,
  item: BotStatRecordModel,
  langId: LanguageCode,
): Promise<void> => {
  mockBotStatFind(pool, item.chatId, [item]);
  return mockBotStatUpdateLang(pool, item, langId);
};

const mockBotStatFind = (
  pool: MockPool,
  chatId: number,
  items: BotStatRecordModel[] = [],
): void => {
  pool.mockQuery(UsagesSql.getRows, (values) => {
    expect(values).toHaveLength(1);
    const [rChatId] = values;
    expect(rChatId).toBe(chatId);
    return Promise.resolve({ rows: items.map((stat) => getDbDto(stat)) });
  });
};

const mockBotStatCreate = (
  pool: MockPool,
  chatId: number,
  userName: string,
  lang: LanguageCode,
): BotStatRecordModel => {
  const stat = new BotStatRecordModel(chatId, lang);
  const objectId = randomIntFromInterval(1, 100000);
  stat.setObjectId(objectId).setUserName(userName);

  pool.mockQuery(UsagesSql.insertRow, (values) => {
    expect(values).toHaveLength(7);
    const [rId, rChatId, rUser, rUsageCount, rLangId, rCreated, rUpdated] =
      values;
    expect(typeof rId).toBe("string");
    expect(rChatId).toBe(stat.chatId);
    expect(rUser).toBe(stat.user);
    expect(rUsageCount).toBe(stat.usageCount);
    expect(rLangId).toBe(stat.langId);
    expect(rCreated).toBe(rUpdated);

    return Promise.resolve({ rows: [getDbDto(stat)] });
  });

  return stat;
};

const mockBotStatUpdateUsage = (
  pool: MockPool,
  item: BotStatRecordModel,
): Promise<void> => {
  return new Promise((resolve) => {
    pool.mockQuery(UsagesSql.updateRow, (values) => {
      expect(values).toHaveLength(5);
      const [rUser, rUsageCount, rLangId, , rUsageId] = values;
      expect(rUser).toBe(item.user);
      expect(rUsageCount).toBe(item.usageCount + 1);
      expect(rLangId).toBe(item.langId);
      expect(rUsageId).toBe(item.objectId);
      resolve();

      return Promise.resolve({ rows: [getDbDto(item)] });
    });
  });
};

const mockBotStatUpdateLang = (
  pool: MockPool,
  item: BotStatRecordModel,
  langId: LanguageCode,
): Promise<void> => {
  return new Promise((resolve) => {
    pool.mockQuery(UsagesSql.updateRow, (values) => {
      expect(values).toHaveLength(5);
      const [rUser, rUsageCount, rLangId, , rUsageId] = values;
      expect(rUser).toBe(item.user);
      expect(rUsageCount).toBe(item.usageCount);
      expect(rLangId).toBe(langId);
      expect(rUsageId).toBe(item.objectId);

      item.setLang(langId);
      resolve();

      return Promise.resolve({ rows: [getDbDto(item)] });
    });
  });
};

const getDbDto = (item: BotStatRecordModel): UsageRowScheme => {
  return {
    usage_id: item.objectId || "",
    chat_id: item.chatId,
    user_name: item.user,
    usage_count: item.usageCount,
    lang_id: item.langId,
    created_at: new Date(),
    updated_at: new Date(),
  };
};
