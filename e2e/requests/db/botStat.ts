import { expect } from "@jest/globals";
import nock from "nock";
import { UsageStatisticApi } from "../../../src/statistic/usage";
import { LanguageCode } from "../../../src/recognition/types";
import { BotStatRecordModel } from "../../helpers";
import { randomIntFromInterval } from "../../../src/common/timer";

const path = `/classes/${UsageStatisticApi.dbClass}`;

export function mockGetBotStatItem(
  host: nock.Scope,
  chatId: number,
  item?: BotStatRecordModel
): BotStatRecordModel {
  if (!item) {
    mockBotStatFind(host, chatId);
    const stat = mockBotStatCreate(host, chatId, "");
    mockBotStatGet(host, stat);
    return stat;
  }

  mockBotStatFind(host, chatId, [item]);
  mockBotStatGet(host, item);
  return item;
}

export function mockUpdateBotStatUsage(
  host: nock.Scope,
  item: BotStatRecordModel
): Promise<void> {
  mockBotStatFind(host, item.chatId, [item]);
  mockBotStatGet(host, item);
  return mockBotStatUpdateUsage(host, item);
}

export function mockUpdateBotStatLang(
  host: nock.Scope,
  item: BotStatRecordModel,
  langId: LanguageCode
): Promise<void> {
  mockBotStatFind(host, item.chatId, [item]);
  mockBotStatGet(host, item);
  return mockBotStatUpdateLang(host, item, langId);
}

function mockBotStatFind(
  host: nock.Scope,
  chatId: number,
  items: BotStatRecordModel[] = []
): void {
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
  chatId: number,
  userName: string
): BotStatRecordModel {
  const stat = new BotStatRecordModel(chatId, LanguageCode.En);
  const objectId = randomIntFromInterval(1, 100000);
  stat.setObjectId(objectId).setUserName(userName);

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
  item: BotStatRecordModel
): Promise<void> {
  return new Promise((resolve) => {
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
  item: BotStatRecordModel,
  langId: LanguageCode
): Promise<void> {
  return new Promise((resolve) => {
    host.post(`${path}/${item.objectId}`).reply((uri, body) => {
      const requestBody = typeof body === "string" ? JSON.parse(body) : body;

      expect(requestBody.langId).toBe(langId);
      item.setLang(langId);
      resolve();
      return [200, JSON.stringify({})];
    });
  });
}
