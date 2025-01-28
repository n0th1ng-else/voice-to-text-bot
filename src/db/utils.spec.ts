import { describe, it, expect } from "vitest";
import {
  validateConfigState,
  isDBConfigValid,
  type DbConnectionConfig,
} from "./utils.ts";

const cfg: DbConnectionConfig = {
  certificate: "some-cert",
  database: "some-db-name",
  host: "some-host",
  password: "new-password",
  port: 4300,
  user: "db-user",
};

describe("db-utils", () => {
  describe("validateConfigState", () => {
    it.each([["user"], ["password"], ["host"], ["database"], ["port"]])(
      "should return invalid, if %s is missing",
      (field) => {
        const config = { ...cfg, [field]: undefined };
        expect(validateConfigState(config)).toBe("invalid");
      },
    );

    it("should return unsecure, if certificate is missing", () => {
      const config = { ...cfg, certificate: undefined };
      expect(validateConfigState(config)).toBe("unsecure");
    });

    it("should return valid, if everything is okay", () => {
      const config = { ...cfg };
      expect(validateConfigState(config)).toBe("valid");
    });
  });

  describe("isDBConfigValid", () => {
    it.each([["user"], ["password"], ["host"], ["database"], ["port"]])(
      "should return false, if %s is missing",
      (field) => {
        const config = { ...cfg, [field]: undefined };
        expect(isDBConfigValid(config)).toBe(false);
      },
    );

    it("should return true, if certificate is missing", () => {
      const config = { ...cfg, certificate: undefined };
      expect(isDBConfigValid(config)).toBe(true);
    });

    it("should return true, if everything is okay", () => {
      const config = { ...cfg };
      expect(isDBConfigValid(config)).toBe(true);
    });
  });
});
