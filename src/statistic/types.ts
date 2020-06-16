import { LanguageCode } from "../recognition/types";

export enum NodeStatKey {
  Active = "active",
  SelfUrl = "selfUrl",
  Version = "version",
}

export enum UsageStatKey {
  UsageCount = "usageCount",
  LangId = "langId",
  ChatId = "chatId",
  UserName = "user",
  CreatedAt = "createdAt",
}

export interface UsageStatCache {
  [UsageStatKey.ChatId]: number;
  [UsageStatKey.LangId]: LanguageCode;
}
