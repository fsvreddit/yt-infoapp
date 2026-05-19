import { settings } from "@devvit/web/server";
import { Duration } from "date-fns";

export enum AppSetting {
    // Subreddit-scoped settings
    AddCommentsWithVideoInformation = "addCommentsWithVideoInformation",
    IncludeViewCountInVideoInfoComment = "includeViewCountInVideoInfoComment",
    IncludeSubscriberCountInVideoInfoComment = "includeSubscriberCountInVideoInfoComment",
    IncludeVideoDescriptionInVideoInfoComment = "includeVideoDescriptionInVideoInfoComment",
    StickyVideoInfoComment = "stickyVideoInfoComment",

    ActionContentBasedOnSubscriberCount = "actionContentBasedOnSubscriberCount",
    SubscriberThreshold = "subscriberThreshold",
    SubscriberActionToTake = "subscriberActionToTake",
    SubscriberRemovalMessage = "subscriberRemovalMessage",

    ActionContentBasedOnDuration = "actionContentBasedOnDuration",
    DurationThreshold = "durationThreshold",
    DurationActionToTake = "durationActionToTake",
    DurationRemovalMessage = "durationRemovalMessage",

    ActionContentBasedOnHashtags = "actionContentBasedOnHashtags",
    HashtagsToCheck = "hashtagsToCheck",
    HashtagActionToTake = "hashtagActionToTake",
    HashtagRemovalMessage = "hashtagRemovalMessage",

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
    [AppSetting.SubscriberActionToTake]: "remove" | "filter";
    [AppSetting.SubscriberRemovalMessage]: string;
    [AppSetting.StickyRemovalMessage]: boolean;
    [AppSetting.ActionContentBasedOnDuration]: "never" | "durationShorterThan" | "durationLongerThan";
    [AppSetting.DurationThreshold]?: Duration;
    [AppSetting.DurationActionToTake]: "remove" | "filter";
    [AppSetting.DurationRemovalMessage]: string;
    [AppSetting.ActionContentBasedOnHashtags]: boolean;
    [AppSetting.HashtagsToCheck]: string[];
    [AppSetting.HashtagActionToTake]: "remove" | "filter";
    [AppSetting.HashtagRemovalMessage]: string;
}

function firstValueFromArray (arr: string[], defaultValue: string): string {
    return arr[0] ?? defaultValue;
}

export function parseDurationSetting (duration: string | undefined): Duration | undefined {
    if (duration === "" || duration === undefined) {
        return undefined;
    }

    const parts = duration.split(":").map(part => parseInt(part, 10));
    const result: Duration = {};

    if (parts.length === 3) {
        result.hours = parts[0];
        result.minutes = parts[1];
        result.seconds = parts[2];
    } else if (parts.length === 2) {
        result.hours = 0;
        result.minutes = parts[0];
        result.seconds = parts[1];
    } else if (parts.length === 1) {
        result.hours = 0;
        result.minutes = 0;
        result.seconds = parts[0];
    } else {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    if (result.minutes !== undefined && (result.minutes < 0 || result.minutes >= 60)) {
        throw new Error(`Invalid minutes value in duration: ${duration}`);
    }

    if (result.seconds !== undefined && (result.seconds < 0 || result.seconds >= 60)) {
        throw new Error(`Invalid seconds value in duration: ${duration}`);
    }

    return result;
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
        [AppSetting.SubscriberActionToTake]: firstValueFromArray(appSettings[AppSetting.SubscriberActionToTake] as string[], "noAction") as "remove" | "filter",
        [AppSetting.SubscriberRemovalMessage]: appSettings[AppSetting.SubscriberRemovalMessage] as string | undefined ?? "",
        [AppSetting.ActionContentBasedOnDuration]: firstValueFromArray(appSettings[AppSetting.ActionContentBasedOnDuration] as string[], "never") as "never" | "durationShorterThan" | "durationLongerThan",
        [AppSetting.DurationThreshold]: parseDurationSetting(appSettings[AppSetting.DurationThreshold] as string | undefined),
        [AppSetting.DurationActionToTake]: firstValueFromArray(appSettings[AppSetting.DurationActionToTake] as string[], "noAction") as "remove" | "filter",
        [AppSetting.DurationRemovalMessage]: appSettings[AppSetting.DurationRemovalMessage] as string | undefined ?? "",
        [AppSetting.ActionContentBasedOnHashtags]: appSettings[AppSetting.ActionContentBasedOnHashtags] as boolean | undefined ?? false,
        [AppSetting.HashtagsToCheck]: (appSettings[AppSetting.HashtagsToCheck] as string | undefined ?? "").split(",").map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0),
        [AppSetting.HashtagActionToTake]: firstValueFromArray(appSettings[AppSetting.HashtagActionToTake] as string[], "noAction") as "remove" | "filter",
        [AppSetting.HashtagRemovalMessage]: appSettings[AppSetting.HashtagRemovalMessage] as string | undefined ?? "",
        [AppSetting.StickyRemovalMessage]: appSettings[AppSetting.StickyRemovalMessage] as boolean | undefined ?? false,
    };
}
