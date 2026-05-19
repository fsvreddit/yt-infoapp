import assert from "node:assert/strict";
import { describe, it } from "vitest";
import devvitConfig from "../../../devvit.json";
import { AppSetting, parseDurationSetting } from "./appSettings.js";

const configSettingKeys = [
    ...Object.keys(devvitConfig.settings.subreddit),
    ...Object.keys(devvitConfig.settings.global),
].sort();

const appSettingValues: string[] = Object.values(AppSetting).sort();

describe("AppSetting configuration parity", () => {
    it("has a devvit.json setting for every AppSetting enum value", () => {
        const missingFromConfig = appSettingValues.filter(setting => !configSettingKeys.includes(setting));

        assert.deepEqual(missingFromConfig, []);
    });

    it("has an AppSetting enum value for every devvit.json setting", () => {
        const missingFromEnum = configSettingKeys.filter(setting => !appSettingValues.includes(setting));

        assert.deepEqual(missingFromEnum, []);
    });
});

describe("parseDurationSetting", () => {
    it("returns undefined for an empty string", () => {
        assert.equal(parseDurationSetting(""), undefined);
    });

    it("returns undefined for undefined input", () => {
        assert.equal(parseDurationSetting(undefined), undefined);
    });

    it("parses a valid h:mm:ss value", () => {
        assert.deepEqual(parseDurationSetting("1:02:03"), {
            hours: 1,
            minutes: 2,
            seconds: 3,
        });
    });

    it("parses a valid hh:mm:ss value", () => {
        assert.deepEqual(parseDurationSetting("01:02:03"), {
            hours: 1,
            minutes: 2,
            seconds: 3,
        });
    });

    it("parses a valid mm:ss value", () => {
        assert.deepEqual(parseDurationSetting("02:03"), {
            hours: 0,
            minutes: 2,
            seconds: 3,
        });
    });

    it("parses a valid ss value", () => {
        assert.deepEqual(parseDurationSetting("03"), {
            hours: 0,
            minutes: 0,
            seconds: 3,
        });
    });

    it("throws for out-of-range minute values", () => {
        assert.throws(() => parseDurationSetting("01:60:00"), /Invalid minutes value/);
        assert.throws(() => parseDurationSetting("01:-1:00"), /Invalid minutes value/);
    });

    it("throws for out-of-range second values", () => {
        assert.throws(() => parseDurationSetting("01:00:60"), /Invalid seconds value/);
        assert.throws(() => parseDurationSetting("01:00:-1"), /Invalid seconds value/);
    });
});
