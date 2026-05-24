import { OnModActionRequest, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { clearPrivilegedUserCache } from "../core";

export const handleModAction = async (c: Context) => {
    const request = await c.req.json<OnModActionRequest>();

    if (!request.targetUser) {
        return c.json<TriggerResponse>({ message: "mod action handled - no target user" }, 200);
    }

    if (!request.action?.includes("moderator") && !request.action?.includes("contributor")) {
        return c.json<TriggerResponse>({ message: "mod action handled - not a mod or contributor action" }, 200);
    }

    await clearPrivilegedUserCache(request.targetUser.name);

    return c.json<TriggerResponse>({ message: "mod action handled" }, 200);
};
