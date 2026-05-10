import { OnCommentCreateRequest, T1, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { actionContentBasedOnSubscribers, addInfoComment, AppSetting, getSettings, parseYoutubeUrlFromText } from "../core";
import { context } from "@devvit/web/server";
import { hasTriggerBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";

export const handleCommentCreate = async (c: Context) => {
    const request = await c.req.json<OnCommentCreateRequest>();
    if (!request.comment?.body) {
        return c.json<TriggerResponse>({ message: "comment create handled - no body" }, 200);
    }

    if (request.author?.name === context.appSlug) {
        return c.json<TriggerResponse>({ message: "comment create handled - comment by bot" }, 200);
    }

    const videoIds = new Set(parseYoutubeUrlFromText(request.comment.body));

    if (videoIds.size === 0) {
        return c.json<TriggerResponse>({ message: "comment create handled - no url" }, 200);
    }

    const appSettings = await getSettings();
    if (appSettings[AppSetting.AddCommentsWithVideoInformation] === "never" && appSettings[AppSetting.ActionContentBasedOnSubscriberCount] === "never") {
        return c.json<TriggerResponse>({ message: "comment create handled - no action configured" }, 200);
    }

    if (await hasTriggerBeenHandled(`commentCreate:${request.comment.id}`)) {
        return c.json<TriggerResponse>({ message: "comment create handled - already handled" }, 200);
    }

    if (appSettings[AppSetting.ActionContentBasedOnSubscriberCount] !== "never") {
        const result = await actionContentBasedOnSubscribers(Array.from(videoIds), request.comment.id as T1);
        if (result) {
            return c.json(result, 200);
        }
    }

    if (appSettings[AppSetting.AddCommentsWithVideoInformation] === "comments" || appSettings[AppSetting.AddCommentsWithVideoInformation] === "always") {
        await addInfoComment(Array.from(videoIds), request.comment.id as T1);
    }

    return c.json<TriggerResponse>({ message: "comment create handled" }, 200);
};
