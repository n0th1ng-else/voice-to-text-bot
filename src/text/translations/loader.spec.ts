import * as fsUtils from "node:fs";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BotCommand } from "../../telegram/commands.js";
import {
  createTranslationsFileForLocale,
  initializeMenuLabels,
  initializeTranslationsForLocale,
} from "./loader.js";

vi.mock("node:fs");

vi.mock("../types", async () => {
  const originalModule = await vi.importActual("../types.js");
  return {
    ...originalModule,
    TranslationKeys: {
      WelcomeMessage: "start.welcomeMessage",
      WelcomeMessageGroup: "start.groupSupport",
    },
  };
});

describe("text.loader", () => {
  describe("initializeMenuLabels", () => {
    it("should return menu labels", () => {
      const labels = initializeMenuLabels();
      expect(labels).toStrictEqual({
        [BotCommand.Language]: "Switch the recognition language",
        [BotCommand.Support]: "Show support links",
        [BotCommand.Start]: "Say hello and see bot info",
        [BotCommand.Donate]: "Help us with funding the project",
      });
    });
  });

  describe("initializeTranslationsForLocale", () => {
    it("should throw an error if translation file is not found", () => {
      vi.spyOn(fsUtils, "existsSync").mockReturnValue(false);
      expect(() => initializeTranslationsForLocale("en-US")).toThrowError();
    });

    describe("the file exists", () => {
      beforeEach(() => {
        vi.spyOn(fsUtils, "existsSync").mockReturnValue(true);
      });

      it("should throw an error if the file is not json", () => {
        vi.spyOn(fsUtils, "readFileSync").mockReturnValue("{");
        expect(() => initializeTranslationsForLocale("en-US")).toThrowError(
          expect.objectContaining({ name: "SyntaxError" }),
        );
      });

      it("should throw an error if it is not complete with the translations", () => {
        vi.spyOn(fsUtils, "readFileSync").mockReturnValue("{}");

        expect(() => initializeTranslationsForLocale("en-US")).toThrowError(
          expect.objectContaining({
            issues: expect.arrayContaining([
              expect.objectContaining({
                code: "custom",
                message: "Not all translation keys are implemented",
              }),
            ]),
          }),
        );
      });

      it("should return the translations if the file is complete", () => {
        const file = {
          "start.groupSupport": "support",
          "start.welcomeMessage": "welcome",
        };
        vi.spyOn(fsUtils, "readFileSync").mockReturnValue(JSON.stringify(file));
        expect(initializeTranslationsForLocale("en-US")).toEqual(file);
      });
    });
  });

  describe("createTranslationsFileForLocale", () => {
    it("should return file with empty values if it does not yet exist", () => {
      const fileContent = JSON.stringify(
        {
          "start.groupSupport": "",
          "start.welcomeMessage": "",
        },
        null,
        2,
      );
      vi.spyOn(fsUtils, "existsSync").mockReturnValue(false);
      createTranslationsFileForLocale("en-US");
      expect(fsUtils.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("translations.en-US.json"),
        `${fileContent}\n`,
      );
    });

    it("should keep the translations that are already exist and add missing ones", () => {
      const file = {
        "start.welcomeMessage": "welcome",
      };
      const fileContent = JSON.stringify(
        {
          "start.groupSupport": "",
          "start.welcomeMessage": "welcome",
        },
        null,
        2,
      );
      vi.spyOn(fsUtils, "existsSync").mockReturnValue(true);
      vi.spyOn(fsUtils, "readFileSync").mockReturnValue(JSON.stringify(file));
      createTranslationsFileForLocale("en-US");
      expect(fsUtils.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("translations.en-US.json"),
        `${fileContent}\n`,
      );
    });
  });
});
