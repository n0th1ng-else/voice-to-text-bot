import { DbClient } from "./client.js";
import type { LanguageCode } from "../recognition/types.js";
import type { UsageRowScheme } from "./sql/usages.js";
import type { NodeRowScheme } from "./sql/nodes.js";
import type { DonationRowScheme, DonationStatusType } from "./sql/donations.js";
import type { IgnoredChatsRowScheme } from "./sql/ignoredchats.js";
import type { DbConnectionConfig } from "./utils.js";

class DbCore {
  private readonly clients: DbClient[];
  private readonly main: DbClient;

  constructor(
    main: DbConnectionConfig,
    configs: DbConnectionConfig[],
    threadId = 0,
    mainClient?: DbClient,
  ) {
    this.main = mainClient ?? new DbClient(main, threadId);
    this.clients = configs.map((config) =>
      new DbClient(config, threadId).setSecondary(),
    );
  }

  public async init(): Promise<void> {
    await this.main.init();
    await Promise.all(this.clients.map((client) => client.init()));
  }

  public isReady(): boolean {
    return this.main.isReady();
  }

  public async updateNodeState(
    selfUrl: string,
    isActive: boolean,
    version: string,
  ): Promise<NodeRowScheme> {
    const row = await this.main.nodes.updateState(selfUrl, isActive, version);
    return row;
  }

  public async getLanguage(
    chatId: number,
    username: string,
    langId: LanguageCode,
  ): Promise<LanguageCode> {
    const row = await this.main.usages.getLangId(chatId, username, langId);
    return row;
  }

  public async updateLanguage(
    chatId: number,
    langId: LanguageCode,
  ): Promise<UsageRowScheme> {
    const row = await this.main.usages.updateLangId(chatId, langId);
    return row;
  }

  public async updateUsageCount(
    chatId: number,
    username: string,
    langId: LanguageCode,
  ): Promise<UsageRowScheme> {
    const row = await this.main.usages.updateUsageCount(
      chatId,
      username,
      langId,
    );
    return row;
  }

  public async importUsageRow(
    chatId: number,
    usageCount: number,
    langId: string,
    username: string,
    createdAt: Date,
    updatedAt: Date,
  ): Promise<UsageRowScheme> {
    const row = await this.main.usages.importRow(
      chatId,
      usageCount,
      langId,
      username,
      createdAt,
      updatedAt,
    );
    return row;
  }

  public async fetchUsageRows(
    from: Date,
    to: Date,
    usageCountFrom: number,
  ): Promise<UsageRowScheme[]> {
    const rows = await this.main.usages.statRows(from, to, usageCountFrom);
    return rows;
  }

  public async updateDonationRow(
    donationId: number,
    status: DonationStatusType,
  ): Promise<DonationRowScheme> {
    const row = await this.main.donations.updateRow(donationId, status);
    return row;
  }

  public async createDonationRow(
    chatId: number,
    price: number,
  ): Promise<DonationRowScheme> {
    const row = await this.main.donations.createRow(chatId, price);
    return row;
  }

  public getDonationId(row: DonationRowScheme): number {
    return this.main.donations.getRowId(row);
  }

  public async getIgnoredChatRow(
    chatId: number,
  ): Promise<IgnoredChatsRowScheme | null> {
    return this.main.ignoredChats.getRow(chatId);
  }
}

export const getDb = (
  configs: DbConnectionConfig[],
  threadId = 0,
  mainClient?: DbClient,
): DbCore => {
  const main = configs.shift();
  if (!main) {
    throw new Error("No database configs found");
  }

  return new DbCore(main, configs, threadId, mainClient);
};
