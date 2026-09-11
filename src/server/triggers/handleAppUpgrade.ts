import { TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { context } from "@devvit/web/server";
import { configureCronJobs } from "../core";

export const handleAppUpgrade = async (c: Context) => {
    console.log(`App upgraded in subreddit ${context.subredditName} to version ${context.appVersion}`);

    await configureCronJobs();

    return c.json<TriggerResponse>({ message: "app upgrade handled" }, 200);
};
