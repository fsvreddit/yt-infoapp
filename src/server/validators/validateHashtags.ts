import { SettingsValidationRequest, SettingsValidationResponse } from "@devvit/web/shared";
import type { Context } from "hono";

export const handleValidateHashtags = async (c: Context) => {
    const validationRequest = await c.req.json<SettingsValidationRequest<string>>();
    if (!validationRequest.value) {
        return c.json<SettingsValidationResponse>({
            success: true,
        });
    }

    const hashtags = validationRequest.value.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);

    const hashtagRegex = /^#[a-zA-Z0-9_-]+$/;
    const invalidHashtags = hashtags.filter(tag => !hashtagRegex.test(tag));

    if (invalidHashtags.length > 0) {
        return c.json<SettingsValidationResponse>({
            success: false,
            error: `Invalid hashtag(s): ${invalidHashtags.join(", ")}. Hashtags must start with a '#' and can only contain letters, numbers, underscores, and hyphens.`,
        });
    }

    return c.json<SettingsValidationResponse>({
        success: true,
    });
};
