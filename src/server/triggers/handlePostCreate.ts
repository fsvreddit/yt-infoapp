import { OnPostCreateRequest, T3, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { actionContentBasedOnThresholds, addInfoComment, AppSetting, getSettings, parseYoutubeUrlFromText } from "../core";
import { context } from "@devvit/web/server";
import { hasTriggerBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";

export const handlePostCreate = async (c: Context) => {
    const request = await c.req.json<OnPostCreateRequest>();
    if (!request.post) {
        return c.json<TriggerResponse>({ message: "post create handled - no url" }, 200);
    }

    if (request.author?.name === context.appSlug) {
        return c.json<TriggerResponse>({ message: "post create handled - post by bot" }, 200);
    }

    const videoIds = new Set(parseYoutubeUrlFromText(request.post.url));
    for (const videoId of parseYoutubeUrlFromText(request.post.selftext)) {
        videoIds.add(videoId);
    }

    if (videoIds.size === 0) {
        return c.json<TriggerResponse>({ message: "post create handled - no url" }, 200);
    }

    const appSettings = await getSettings();
    if (appSettings[AppSetting.AddCommentsWithVideoInformation] === "never" && appSettings[AppSetting.ActionContentBasedOnSubscriberCount] === "never" && appSettings[AppSetting.ActionContentBasedOnDuration] === "never" && !appSettings[AppSetting.ActionContentBasedOnHashtags]) {
        return c.json<TriggerResponse>({ message: "post create handled - no action configured" }, 200);
    }

    if (await hasTriggerBeenHandled(`postCreate:${request.post.id}`)) {
        return c.json<TriggerResponse>({ message: "post create handled - already handled" }, 200);
    }

    if (appSettings[AppSetting.ActionContentBasedOnSubscriberCount] !== "never" || appSettings[AppSetting.ActionContentBasedOnDuration] !== "never" || appSettings[AppSetting.ActionContentBasedOnHashtags]) {
        const result = await actionContentBasedOnThresholds(Array.from(videoIds), request.post.id as T3);
        if (result) {
            return c.json(result, 200);
        }
    }

    if (appSettings[AppSetting.AddCommentsWithVideoInformation] === "posts" || appSettings[AppSetting.AddCommentsWithVideoInformation] === "always") {
        await addInfoComment(Array.from(videoIds), request.post.id as T3);
    }

    return c.json<TriggerResponse>({ message: "post create handled" }, 200);
};
