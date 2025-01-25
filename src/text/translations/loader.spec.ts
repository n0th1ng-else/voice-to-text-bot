import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  injectDependencies,
  type InjectedFn,
} from "../../testUtils/dependencies.js";

const existsSyncMock = vi.fn();
const readFileSyncMock = vi.fn();
const writeFileSyncMock = vi.fn();

vi.mock("node:fs", async () => {
  const originalModule = await vi.importActual("node:fs");
  return {
    ...originalModule,
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
    writeFileSync: writeFileSyncMock,
  };
});

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

let initializeMenuLabels: InjectedFn["initializeMenuLabels"];
let initializeTranslationsForLocale: InjectedFn["initializeTranslationsForLocale"];
let createTranslationsFileForLocale: InjectedFn["createTranslationsFileForLocale"];
let BotCommand: InjectedFn["BotCommand"];

describe("text.loader", () => {
  beforeEach(async () => {
    const init = await injectDependencies();
    initializeMenuLabels = init.initializeMenuLabels;
    initializeTranslationsForLocale = init.initializeTranslationsForLocale;
    createTranslationsFileForLocale = init.createTranslationsFileForLocale;
    BotCommand = init.BotCommand;
  });

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
      existsSyncMock.mockReturnValue(false);
      expect(() => initializeTranslationsForLocale("en-US")).toThrowError();
    });

    describe("the file exists", () => {
      beforeEach(() => {
        existsSyncMock.mockReturnValue(true);
      });

      it("should throw an error if the file is not json", () => {
        readFileSyncMock.mockReturnValue("{");
        expect(() => initializeTranslationsForLocale("en-US")).toThrowError(
          expect.objectContaining({ name: "SyntaxError" }),
        );
      });

      it("should throw an error if it is not complete with the translations", () => {
        readFileSyncMock.mockReturnValue("{}");
        expect(() => initializeTranslationsForLocale("en-US")).toThrowError(
          expect.objectContaining({
            name: "ZodError",
            message: expect.stringContaining(
              "Not all translation keys are implemented",
            ),
          }),
        );
      });

      it("should return the translations if the file is complete", () => {
        const file = {
          "start.groupSupport": "support",
          "start.welcomeMessage": "welcome",
        };
        readFileSyncMock.mockReturnValue(JSON.stringify(file));
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
      existsSyncMock.mockReturnValue(false);
      createTranslationsFileForLocale("en-US");
      expect(writeFileSyncMock).toHaveBeenCalledWith(
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
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(file));
      createTranslationsFileForLocale("en-US");
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining("translations.en-US.json"),
        `${fileContent}\n`,
      );
    });
  });
});
