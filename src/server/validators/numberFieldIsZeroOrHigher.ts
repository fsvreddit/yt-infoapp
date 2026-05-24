import { SettingsValidationRequest, SettingsValidationResponse } from "@devvit/web/shared";
import type { Context } from "hono";

export const handleNumberFieldIsZeroOrHigher = async (c: Context) => {
    const validationRequest = await c.req.json<SettingsValidationRequest<number>>();

    if (validationRequest.value === undefined || validationRequest.value < 0) {
        return c.json<SettingsValidationResponse>({
            success: false,
            error: "Value must be zero or higher.",
        });
    }

    return c.json<SettingsValidationResponse>({ success: true }, 200);
};
