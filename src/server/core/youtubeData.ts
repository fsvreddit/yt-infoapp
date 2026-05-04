import { redis, settings } from "@devvit/web/server";
import { AppSetting } from "./appSettings";
import { addDays } from "date-fns";

interface APIVideoResponse {
    items: {
        id: string;
        snippet: {
            title: string;
            description: string;
            channelId: string;
            channelTitle: string;
            publishedAt: string;
        };
        statistics: {
            viewCount: string;
            likeCount: string;
            dislikeCount: string;
            commentCount: string;
        };
        contentDetails: {
            duration: string;
        };
    }[];
}

interface APIChannelResponse {
    items: {
        id: string;
        statistics: {
            subscriberCount: string;
            videoCount: string;
        };
        brandingSettings: {
            channel: {
                title: string;
                description: string;
            };
        };
    }[];
}

export interface VideoData {
    id: string;
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: number;
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    duration: {
        hours: number;
        minutes: number;
        seconds: number;
    };
}

export interface ChannelData {
    id: string;
    title: string;
    description: string;
    subscriberCount: number;
    videoCount: number;
}

function parseVideoData (apiResponse: APIVideoResponse): VideoData[] {
    return apiResponse.items.map((video) => {
        const durationMatch = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(video.contentDetails.duration);
        const hours = durationMatch?.[1] ? parseInt(durationMatch[1]) : 0;
        const minutes = durationMatch?.[2] ? parseInt(durationMatch[2]) : 0;
        const seconds = durationMatch?.[3] ? parseInt(durationMatch[3]) : 0;
        return {
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle,
            publishedAt: new Date(video.snippet.publishedAt).getTime(),
            viewCount: parseInt(video.statistics.viewCount),
            likeCount: parseInt(video.statistics.likeCount),
            dislikeCount: parseInt(video.statistics.dislikeCount),
            commentCount: parseInt(video.statistics.commentCount),
            duration: {
                hours,
                minutes,
                seconds,
            },
        };
    });
}

function parseChannelData (apiResponse: APIChannelResponse): ChannelData[] {
    return apiResponse.items.map(channel => ({
        id: channel.id,
        title: channel.brandingSettings.channel.title,
        description: channel.brandingSettings.channel.description,
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        videoCount: parseInt(channel.statistics.videoCount),
    }));
}

async function getAPIKey (): Promise<string> {
    const apiKey = await settings.get<string>(AppSetting.YoutubeAPIKey);
    if (!apiKey) {
        throw new Error("YouTube API key not set in app settings");
    }

    return apiKey;
}

function getCacheKeyForVideo (videoId: string): string {
    return `videoData:${videoId}`;
}

export async function getVideoData (videoIds: string[]): Promise<Record<string, VideoData>> {
    const results: Record<string, VideoData> = {};
    for (const videoId of videoIds) {
        const cacheKey = getCacheKeyForVideo(videoId);
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            results[videoId] = JSON.parse(cachedData) as VideoData;
        }
    }

    const missingVideoIds = videoIds.filter(id => !results[id]);

    if (missingVideoIds.length === 0) {
        return results;
    }

    const apiKey = await getAPIKey();

    const url = new URL("https://youtube.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails,statistics");
    url.searchParams.set("id", missingVideoIds.join(","));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), { method: "GET" });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`YouTube API error: ${err}`);
    }

    const data = await response.json() as APIVideoResponse;
    const videoData = parseVideoData(data);

    for (const video of videoData) {
        results[video.id] = video;
        await redis.set(getCacheKeyForVideo(video.id), JSON.stringify(video), { expiration: addDays(new Date(), 1) });
    }

    return results;
}

function getCacheKeyForChannel (channelId: string): string {
    return `channelData:${channelId}`;
}

export async function getChannelData (channelIds: string[]): Promise<Record<string, ChannelData>> {
    const results: Record<string, ChannelData> = {};
    for (const channelId of channelIds) {
        const cacheKey = getCacheKeyForChannel(channelId);
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            results[channelId] = JSON.parse(cachedData) as ChannelData;
        }
    }

    const missingChannelIds = channelIds.filter(id => !results[id]);
    if (missingChannelIds.length === 0) {
        return results;
    }

    const apiKey = await getAPIKey();

    const url = new URL("https://youtube.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "statistics,brandingSettings");
    url.searchParams.set("id", missingChannelIds.join(","));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), { method: "GET" });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`YouTube API error: ${err}`);
    }

    const data = await response.json() as APIChannelResponse;
    const channelData = parseChannelData(data);

    for (const channel of channelData) {
        results[channel.id] = channel;
        const cacheKey = getCacheKeyForChannel(channel.id);
        await redis.set(cacheKey, JSON.stringify(channel), { expiration: addDays(new Date(), 1) });
    }

    return results;
}

/**
 * Gets unique YouTube video IDs from a given text string.
 * Supports both standard YouTube links and shortened youtu.be links.
 * @param text The text of a post or comment body
 */
export function parseYoutubeUrlFromText (text: string): string[] {
    const urlRegex = /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})|https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/g;
    const videoIds = new Set<string>();

    const matches = text.matchAll(urlRegex);
    for (const match of matches) {
        const videoId = match[1] ?? match[2];
        if (videoId) {
            videoIds.add(videoId);
        }
    }

    return [...videoIds];
}
