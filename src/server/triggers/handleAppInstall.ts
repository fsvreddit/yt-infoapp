import { TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { context } from "@devvit/web/server";
import { configureCronJobs } from "../core";

export const handleAppInstall = async (c: Context) => {
    console.log(`App installed in subreddit ${context.subredditName} at version ${context.appVersion}`);

    await configureCronJobs();

    return c.json<TriggerResponse>({ message: "app install handled" }, 200);
};
