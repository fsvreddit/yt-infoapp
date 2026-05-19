import { SettingsValidationRequest, SettingsValidationResponse } from "@devvit/web/shared";
import type { Context } from "hono";
import { parseDurationSetting } from "../core";

export const handleValidateDuration = async (c: Context) => {
    const validationRequest = await c.req.json<SettingsValidationRequest<string>>();
    if (!validationRequest.value) {
        return c.json<SettingsValidationResponse>({
            success: true,
        });
    }

    const regex = /^(\d{1,2}:\d{2}:\d{2}|\d{2}:\d{2})$/;

    if (!regex.test(validationRequest.value)) {
        return c.json<SettingsValidationResponse>({
            success: false,
            error: "Invalid duration format. Please use hh:mm:ss or mm:ss.",
        });
    }

    try {
        parseDurationSetting(validationRequest.value);
    } catch (error) {
        return c.json<SettingsValidationResponse>({
            success: false,
            error: (error as Error).message,
        });
    }

    return c.json<SettingsValidationResponse>({
        success: true,
    });
};
