import { isT1, isT3, T1, T3 } from "@devvit/web/shared";
import { reddit } from "@devvit/web/server";
import { AppSetting, ChannelData, getBotCommentFooter, getChannelData, getSettings, getVideoData, SubredditSettings, VideoData } from ".";
import { format } from "date-fns";
import markdownEscape from "markdown-escape";

function formatNumber (input: number): string {
    if (input >= 1_000_000_000) {
        return `${(input / 1_000_000_000).toFixed(1)}B`;
    } else if (input >= 1_000_000) {
        return `${(input / 1_000_000).toFixed(1)}M`;
    } else if (input >= 1_000) {
        return `${(input / 1_000).toFixed(1)}K`;
    } else {
        return input.toString();
    }
}

function blockquote (text: string): string {
    return text.split("\n").map(line => `> ${line}`).join("\n");
}

/**
 * Escapes strings to Markdown without escaping URLs, something that markdownEscape doesn't support properly.
 * @param input A clean string
 * @returns Markdown output escaped apart from URLs
 */
function escapeMarkdownExceptUrls (input: string): string {
    const urlRegex = /\b((https?:\/\/|www\.)[^\s<>()]+)\b/gi;

    // Markdown characters that need escaping
    const mdSpecials = /([\\`*_{}[\]()#+\-.!])/g;

    let result = "";
    let lastIndex = 0;

    input.replace(
        urlRegex,
        (match: string, _url: string, _proto: string, offset: number) => {
            // Escape text before the URL
            const before = input.slice(lastIndex, offset);
            result += before.replace(mdSpecials, "\\$1");

            // Add URL untouched
            result += match;

            lastIndex = offset + match.length;
            return match;
        },
    );

    // Escape remaining text after last URL
    const rest = input.slice(lastIndex);
    result += rest.replace(mdSpecials, "\\$1");

    return result;
}

function getInfoFromVideoId (videoData: VideoData, channelData: Record<string, ChannelData>, appSettings: SubredditSettings): string {
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

    const infoLines: string[] = [];

    let videoInfoLine = `[${markdownEscape(videoData.title)}](https://www.youtube.com/watch?v=${videoData.id}) by [${markdownEscape(videoData.channelTitle)}](https://www.youtube.com/channel/${videoData.channelId})`;
    if (appSettings[AppSetting.IncludeSubscriberCountInVideoInfoComment]) {
        const channel = channelData[videoData.channelId];
        if (channel) {
            videoInfoLine += ` with ${formatNumber(channel.subscriberCount)} subscribers`;
        }
    }

    infoLines.push(videoInfoLine);

    let detailsLine = `Published on ${format(new Date(videoData.publishedAt), "MMMM d, yyyy")}. Runtime: ${runtime.trim()}`;
    if (appSettings[AppSetting.IncludeViewCountInVideoInfoComment]) {
        detailsLine += `, ${formatNumber(videoData.viewCount)} views`;
    }

    infoLines.push(detailsLine);

    if (appSettings[AppSetting.IncludeVideoDescriptionInVideoInfoComment] && videoData.description) {
        infoLines.push("Description:");
        infoLines.push(blockquote(escapeMarkdownExceptUrls(videoData.description)));
    }

    return infoLines.join("\n\n");
}

export async function addInfoComment (videoIds: string[], targetId: T1 | T3) {
    const videoData = await getVideoData(videoIds);
    if (Object.keys(videoData).length === 0) {
        return;
    }

    const kind = isT1(targetId) ? "comment" : "post";

    const appSettings = await getSettings();

    const channelInfo: Record<string, ChannelData> = {};
    if (appSettings[AppSetting.IncludeSubscriberCountInVideoInfoComment]) {
        const channelIds = Array.from(new Set(Object.values(videoData).map(video => video.channelId)));
        const channelData = await getChannelData(channelIds);
        for (const channelId in channelData) {
            if (channelData[channelId]) {
                channelInfo[channelId] = channelData[channelId];
            }
        }
    }

    let commentBody = `Youtube videos found on this ${kind}:\n\n`;
    commentBody += Object.values(videoData).map(video => getInfoFromVideoId(video, channelInfo, appSettings)).join("\n\n---\n\n");

    commentBody = commentBody.trim() + "\n\n---\n\n" + getBotCommentFooter();

    const newComment = await reddit.submitComment({
        id: targetId,
        text: commentBody,
    });

    const shouldSticky = appSettings[AppSetting.StickyVideoInfoComment] && isT3(targetId);

    await newComment.distinguish(shouldSticky);
    await newComment.lock();

    console.log(`Added info comment to ${kind} ${targetId} for videos ${videoIds.join(", ")}`);
}
