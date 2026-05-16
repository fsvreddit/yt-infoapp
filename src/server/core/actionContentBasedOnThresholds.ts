import { isT3, T1, T3, TriggerResponse } from "@devvit/web/shared";
import { AppSetting, ChannelData, getBotCommentFooter, getChannelData, getSettings, getVideoData, VideoData } from ".";
import { reddit } from "@devvit/web/server";
import pluralize from "pluralize";
import { Duration, formatDuration } from "date-fns";
import { getPostOrCommentById } from "@fsvreddit/fsv-devvit-web-helpers";

enum ThresholdIssue {
    SubscriberCount = "subscriberCount",
    Duration = "duration",
}

function isDurationWithinThreshold (videoDuration: Duration, threshold: Duration, isShorterThan: boolean): boolean {
    const videoTotalSeconds = (videoDuration.hours ?? 0) * 3600 + (videoDuration.minutes ?? 0) * 60 + (videoDuration.seconds ?? 0);
    const thresholdTotalSeconds = (threshold.hours ?? 0) * 3600 + (threshold.minutes ?? 0) * 60 + (threshold.seconds ?? 0);
    return isShorterThan ? videoTotalSeconds < thresholdTotalSeconds : videoTotalSeconds > thresholdTotalSeconds;
}

export async function actionContentBasedOnThresholds (videoIds: string[], targetId: T1 | T3): Promise<TriggerResponse | undefined> {
    const appSettings = await getSettings();
    if (appSettings[AppSetting.ActionContentBasedOnSubscriberCount] === "never" && appSettings[AppSetting.ActionContentBasedOnDuration] === "never") {
        return;
    }

    const videoData = await getVideoData(videoIds);

    if (Object.keys(videoData).length === 0) {
        return;
    }

    const filterReasons: string[] = [];
    const removalMessages: string[] = [];
    const thresholdIssues = new Set<ThresholdIssue>();

    if (appSettings[AppSetting.ActionContentBasedOnSubscriberCount] !== "never") {
        const distinctChannelIds = new Set(Object.values(videoData).map(video => video.channelId));
        const channelData = Object.values(await getChannelData(Array.from(distinctChannelIds)));

        const subscriberThreshold = appSettings[AppSetting.SubscriberThreshold];
        let channelsOutsideThreshold: ChannelData[];
        let outOfThresholdType: string | undefined;
        if (appSettings[AppSetting.ActionContentBasedOnSubscriberCount] === "subsLowerThan") {
            channelsOutsideThreshold = channelData.filter(channel => channel.subscriberCount < subscriberThreshold);
            outOfThresholdType = "lower";
        } else {
            channelsOutsideThreshold = channelData.filter(channel => channel.subscriberCount > subscriberThreshold);
            outOfThresholdType = "higher";
        }

        if (channelsOutsideThreshold.length > 0) {
            thresholdIssues.add(ThresholdIssue.SubscriberCount);
            const action = appSettings[AppSetting.SubscriberActionToTake];

            if (action === "filter") {
                filterReasons.push(`${channelsOutsideThreshold.length} YouTube ${pluralize("channel", channelsOutsideThreshold.length)} with ${outOfThresholdType} than ${subscriberThreshold} subscribers`);
            } else {
                removalMessages.push(appSettings[AppSetting.SubscriberRemovalMessage].trim());
            }
        }
    }

    if (appSettings[AppSetting.ActionContentBasedOnDuration] !== "never" && appSettings[AppSetting.DurationThreshold]) {
        const durationThreshold = appSettings[AppSetting.DurationThreshold];
        let videosOutsideThreshold: VideoData[];
        let outOfThresholdType: string | undefined;

        if (appSettings[AppSetting.ActionContentBasedOnDuration] === "durationShorterThan") {
            videosOutsideThreshold = Object.values(videoData).filter(video => isDurationWithinThreshold(video.duration, durationThreshold, true));
            outOfThresholdType = "shorter";
        } else {
            videosOutsideThreshold = Object.values(videoData).filter(video => isDurationWithinThreshold(video.duration, durationThreshold, false));
            outOfThresholdType = "longer";
        }

        if (videosOutsideThreshold.length > 0) {
            thresholdIssues.add(ThresholdIssue.Duration);
            const action = appSettings[AppSetting.DurationActionToTake];
            if (action === "filter") {
                filterReasons.push(`${videosOutsideThreshold.length} video(s) with ${outOfThresholdType} duration than ${formatDuration(durationThreshold)}`);
            } else {
                removalMessages.push(appSettings[AppSetting.DurationRemovalMessage].trim());
            }
        }
    }

    if (filterReasons.length === 0 && removalMessages.length === 0 && thresholdIssues.size === 0) {
        return;
    }

    const target = await getPostOrCommentById(targetId);

    if (removalMessages.length > 0) {
        await target.remove();
        const fullRemovalMessage = removalMessages.join("\n\n---\n\n") + "\n\n---\n\n" + getBotCommentFooter();
        const newComment = await reddit.submitComment({
            id: targetId,
            text: fullRemovalMessage,
        });
        const shouldSticky = appSettings[AppSetting.StickyRemovalMessage] && isT3(targetId);
        await newComment.distinguish(shouldSticky);
        await newComment.lock();
    } else if (filterReasons.length > 0) {
        await target.filter(filterReasons.join("; "), false);
    }

    console.log(`Action taken on ${isT3(targetId) ? "post" : "comment"} ${targetId} for reasons: ${Array.from(thresholdIssues).join(", ")}.`);

    return { message: `Content action taken for reasons: ${Array.from(thresholdIssues).join(", ")}.` };
}
