import { settings } from "@devvit/web/server";

export enum AppSetting {
    // Subreddit-scoped settings
    AddCommentsWithVideoInformation = "addCommentsWithVideoInformation",
    IncludeViewCountInVideoInfoComment = "includeViewCountInVideoInfoComment",
    IncludeSubscriberCountInVideoInfoComment = "includeSubscriberCountInVideoInfoComment",
    IncludeVideoDescriptionInVideoInfoComment = "includeVideoDescriptionInVideoInfoComment",
    StickyVideoInfoComment = "stickyVideoInfoComment",
    ActionContentBasedOnSubscriberCount = "actionContentBasedOnSubscriberCount",
    SubscriberThreshold = "subscriberThreshold",
    ActionToTake = "actionToTake",
    RemovalMessage = "removalMessage",
    StickyRemovalMessage = "stickyRemovalMessage",

    // App-scoped settings
    YoutubeAPIKey = "ytAPIKey",
}

export interface SubredditSettings {
    [AppSetting.AddCommentsWithVideoInformation]: "never" | "posts" | "comments" | "always";
    [AppSetting.IncludeViewCountInVideoInfoComment]: boolean;
    [AppSetting.IncludeSubscriberCountInVideoInfoComment]: boolean;
    [AppSetting.IncludeVideoDescriptionInVideoInfoComment]: boolean;
    [AppSetting.StickyVideoInfoComment]: boolean;
    [AppSetting.ActionContentBasedOnSubscriberCount]: "never" | "subsLowerThan" | "subsHigherThan";
    [AppSetting.SubscriberThreshold]: number;
    [AppSetting.ActionToTake]: "remove" | "filter";
    [AppSetting.RemovalMessage]: string;
    [AppSetting.StickyRemovalMessage]: boolean;
}

function firstValueFromArray (arr: string[], defaultValue: string): string {
    return arr[0] ?? defaultValue;
}

export async function getSettings (): Promise<SubredditSettings> {
    const appSettings = await settings.getAll();
    return {
        [AppSetting.AddCommentsWithVideoInformation]: firstValueFromArray(appSettings[AppSetting.AddCommentsWithVideoInformation] as string[], "never") as "never" | "posts" | "comments" | "always",
        [AppSetting.IncludeViewCountInVideoInfoComment]: appSettings[AppSetting.IncludeViewCountInVideoInfoComment] as boolean | undefined ?? false,
        [AppSetting.IncludeSubscriberCountInVideoInfoComment]: appSettings[AppSetting.IncludeSubscriberCountInVideoInfoComment] as boolean | undefined ?? false,
        [AppSetting.IncludeVideoDescriptionInVideoInfoComment]: appSettings[AppSetting.IncludeVideoDescriptionInVideoInfoComment] as boolean | undefined ?? false,
        [AppSetting.StickyVideoInfoComment]: appSettings[AppSetting.StickyVideoInfoComment] as boolean | undefined ?? false,
        [AppSetting.ActionContentBasedOnSubscriberCount]: firstValueFromArray(appSettings[AppSetting.ActionContentBasedOnSubscriberCount] as string[], "never") as "never" | "subsLowerThan" | "subsHigherThan",
        [AppSetting.SubscriberThreshold]: appSettings[AppSetting.SubscriberThreshold] as number | undefined ?? 1000,
        [AppSetting.ActionToTake]: firstValueFromArray(appSettings[AppSetting.ActionToTake] as string[], "noAction") as "remove" | "filter",
        [AppSetting.RemovalMessage]: appSettings[AppSetting.RemovalMessage] as string | undefined ?? "",
        [AppSetting.StickyRemovalMessage]: appSettings[AppSetting.StickyRemovalMessage] as boolean | undefined ?? false,
    };
}
