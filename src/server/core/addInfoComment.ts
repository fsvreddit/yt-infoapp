import { isT1, isT3, T1, T3 } from "@devvit/web/shared";
import { reddit } from "@devvit/web/server";
import { AppSetting, getBotCommentFooter, getSettings, getVideoData, VideoData } from ".";
import { format } from "date-fns";
import markdownEscape from "markdown-escape";

function getInfoFromVideoId (videoData: VideoData) {
    let runtime = "";
    if (videoData.duration.hours > 0) {
        runtime += `${videoData.duration.hours}h `;
    }
    if (videoData.duration.minutes > 0) {
        runtime += `${videoData.duration.minutes}m `;
    }
    if (videoData.duration.seconds > 0 && videoData.duration.hours === 0) {
        runtime += `${videoData.duration.seconds}s`;
    }

    return [
        `[${markdownEscape(videoData.title)}](https://www.youtube.com/watch?v=${videoData.id}) by [${markdownEscape(videoData.channelTitle)}](https://www.youtube.com/channel/${videoData.channelId})`,
        `Published on ${format(new Date(videoData.publishedAt), "MMMM d, yyyy")}. Runtime: ${runtime}`,
    ].join("\n\n");
}

export async function addInfoComment (videoIds: string[], targetId: T1 | T3) {
    const videoData = await getVideoData(videoIds);
    if (Object.keys(videoData).length === 0) {
        return;
    }

    const kind = isT1(targetId) ? "comment" : "post";

    let commentBody = `Youtube videos found on this ${kind}:\n\n`;
    commentBody += Object.values(videoData).map(getInfoFromVideoId).join("\n\n---\n\n");

    commentBody = commentBody.trim() + "\n\n---\n\n" + getBotCommentFooter();

    const newComment = await reddit.submitComment({
        id: targetId,
        text: commentBody,
    });

    const appSettings = await getSettings();
    const shouldSticky = appSettings[AppSetting.StickyVideoInfoComment] && isT3(targetId);

    await newComment.distinguish(shouldSticky);
    await newComment.lock();

    console.log(`Added info comment to ${kind} ${targetId} for videos ${videoIds.join(", ")}`);
}
