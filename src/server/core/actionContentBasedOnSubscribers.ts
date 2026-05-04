import { isT3, T1, T3, TriggerResponse } from "@devvit/web/shared";
import { AppSetting, ChannelData, getChannelData, getPostOrCommentById, getSettings, getVideoData } from ".";
import { reddit } from "@devvit/web/server";
import pluralize from "pluralize";

export async function actionContentBasedOnSubscribers (videoIds: string[], targetId: T1 | T3): Promise<TriggerResponse | undefined> {
    const appSettings = await getSettings();
    if (appSettings[AppSetting.ActionContentBasedOnSubscriberCount] === "never") {
        return;
    }

    const videoData = await getVideoData(videoIds);

    if (Object.keys(videoData).length === 0) {
        return;
    }

    const distinctChannelIds = new Set(Object.values(videoData).map(video => video.channelId));

    const channelData = Object.values(await getChannelData(Array.from(distinctChannelIds)));
    if (channelData.length === 0) {
        return;
    }

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

    if (channelsOutsideThreshold.length === 0) {
        return;
    }

    const action = appSettings[AppSetting.ActionToTake];
    const target = await getPostOrCommentById(targetId);

    if (action === "remove") {
        await target.remove();
        if (appSettings[AppSetting.RemovalMessage]) {
            const newComment = await reddit.submitComment({
                id: targetId,
                text: appSettings[AppSetting.RemovalMessage],
            });
            const shouldSticky = appSettings[AppSetting.StickyRemovalMessage] && isT3(targetId);
            await newComment.distinguish(shouldSticky);
            await newComment.lock();
        }
    } else {
        await target.filter(`Post contains ${channelsOutsideThreshold.length} YouTube ${pluralize("channel", channelsOutsideThreshold.length)} with ${outOfThresholdType} than ${subscriberThreshold} subscribers`, false);
    }

    console.log(`Action taken on ${isT3(targetId) ? "post" : "comment"} ${targetId} for containing ${channelsOutsideThreshold.length} YouTube ${pluralize("channel", channelsOutsideThreshold.length)} with ${outOfThresholdType} than ${subscriberThreshold} subscribers.`);

    return { message: `Content action taken based on subscriber count of linked channels. ${channelsOutsideThreshold.length} channel(s) were ${outOfThresholdType} than the threshold of ${subscriberThreshold} subscribers.` };
}
