import { expect } from "@jest/globals";
import nock from "nock";
import { UsageStatisticApi } from "../../../src/statistic/usage";
import { LanguageCode } from "../../../src/recognition/types";
import { BotStatRecordModel } from "../../helpers";
import { randomIntFromInterval } from "../../../src/common/timer";
import { Pool as MockPool } from "../../../src/db/__mocks__/pg";
import { UsagesSql } from "../../../src/db/sql/usages.sql";

const path = `/classes/${UsageStatisticApi.dbClass}`;

export function mockGetBotStatItem(
  host: nock.Scope,
  pool: MockPool,
  chatId: number,
  lang: LanguageCode,
  item?: BotStatRecordModel
): BotStatRecordModel {
  if (!item) {
    mockBotStatFind(host, pool, chatId);
    const stat = mockBotStatCreate(host, pool, chatId, "", lang);
    mockBotStatGet(host, stat);
    return stat;
  }

  mockBotStatFind(host, pool, chatId, [item]);
  mockBotStatGet(host, item);
  return item;
}

export function mockUpdateBotStatUsage(
  host: nock.Scope,
  pool: MockPool,
  item: BotStatRecordModel
): Promise<void> {
  mockBotStatFind(host, pool, item.chatId, [item]);
  mockBotStatGet(host, item);
  return mockBotStatUpdateUsage(host, pool, item);
}

export function mockUpdateBotStatLang(
  host: nock.Scope,
  pool: MockPool,
  item: BotStatRecordModel,
  langId: LanguageCode
): Promise<void> {
  mockBotStatFind(host, pool, item.chatId, [item]);
  mockBotStatGet(host, item);
  return mockBotStatUpdateLang(host, pool, item, langId);
}

function mockBotStatFind(
  host: nock.Scope,
  pool: MockPool,
  chatId: number,
  items: BotStatRecordModel[] = []
): void {
  pool.mockQuery(UsagesSql.getRows, (values) => {
    expect(values).toHaveLength(1);
    expect(values[0]).toBe(chatId);
    return Promise.resolve({ rows: items.map((stat) => stat.getDbDto()) });
  });

  host.post(path).reply((uri, body) => {
    const requestBody = typeof body === "string" ? JSON.parse(body) : body;

    expect(requestBody.where.chatId).toBe(chatId);
    expect(requestBody.order).toBe("createdAt");
    return [
      200,
      JSON.stringify({ results: items.map((stat) => stat.getDto()) }),
    ];
  });
}

function mockBotStatCreate(
  host: nock.Scope,
  pool: MockPool,
  chatId: number,
  userName: string,
  lang: LanguageCode
): BotStatRecordModel {
  const stat = new BotStatRecordModel(chatId, lang);
  const objectId = randomIntFromInterval(1, 100000);
  stat.setObjectId(objectId).setUserName(userName);

  pool.mockQuery(UsagesSql.insertRow, (values) => {
    expect(values).toHaveLength(7);
    const [
      rId,
      rChatId,
      rUser,
      rUsageCount,
      rLangId,
      rCreated,
      rUpdated,
    ] = values;
    expect(typeof rId).toBe("string");
    expect(rChatId).toBe(stat.chatId);
    expect(rUser).toBe(stat.user);
    expect(rUsageCount).toBe(stat.usageCount);
    expect(rLangId).toBe(stat.langId);
    expect(rCreated).toBe(rUpdated);

    return Promise.resolve({ rows: [stat.getDbDto()] });
  });

  host.post(path).reply((uri, body) => {
    const requestBody = typeof body === "string" ? JSON.parse(body) : body;

    expect(requestBody.chatId).toBe(stat.chatId);
    expect(requestBody.user).toBe(stat.user);
    expect(requestBody.langId).toBe(stat.langId);
    expect(requestBody.usageCount).toBe(stat.usageCount);
    return [200, JSON.stringify(stat.getDto())];
  });

  return stat;
}

function mockBotStatGet(host: nock.Scope, stat: BotStatRecordModel): void {
  host.post(path).reply((uri, body) => {
    const requestBody = typeof body === "string" ? JSON.parse(body) : body;
    expect(requestBody.where.objectId).toBe(stat.objectId);
    return [
      200,
      JSON.stringify({
        results: [stat.getDto()],
      }),
    ];
  });
}

function mockBotStatUpdateUsage(
  host: nock.Scope,
  pool: MockPool,
  item: BotStatRecordModel
): Promise<void> {
  return new Promise((resolve) => {
    pool.mockQuery(UsagesSql.updateRow, (values) => {
      expect(values).toHaveLength(5);
      const [rUser, rUsageCount, rLangId, , rUsageId] = values;
      expect(rUser).toBe(item.user);
      expect(rUsageCount).toBe(item.usageCount + 1);
      expect(rLangId).toBe(item.langId);
      expect(rUsageId).toBe(item.objectId);

      return Promise.resolve({ rows: [item.getDbDto()] });
    });

    host.post(`${path}/${item.objectId}`).reply((uri, body) => {
      const requestBody = typeof body === "string" ? JSON.parse(body) : body;

      expect(requestBody.usageCount).toBe(item.usageCount + 1);
      expect(requestBody.user).toBe(item.user);
      resolve();
      return [200, JSON.stringify({})];
    });
  });
}

function mockBotStatUpdateLang(
  host: nock.Scope,
  pool: MockPool,
  item: BotStatRecordModel,
  langId: LanguageCode
): Promise<void> {
  return new Promise((resolve) => {
    pool.mockQuery(UsagesSql.updateRow, (values) => {
      expect(values).toHaveLength(5);
      const [rUser, rUsageCount, rLangId, , rUsageId] = values;
      expect(rUser).toBe(item.user);
      expect(rUsageCount).toBe(item.usageCount);
      expect(rLangId).toBe(langId);
      expect(rUsageId).toBe(item.objectId);

      item.setLang(langId);

      return Promise.resolve({ rows: [item.getDbDto()] });
    });

    host.post(`${path}/${item.objectId}`).reply((uri, body) => {
      const requestBody = typeof body === "string" ? JSON.parse(body) : body;

      expect(requestBody.langId).toBe(langId);
      item.setLang(langId);
      resolve();
      return [200, JSON.stringify({})];
    });
  });
}
