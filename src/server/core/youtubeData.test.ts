import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import { AppSetting } from "./appSettings.js";

const devvitMocks = vi.hoisted(() => ({
    redisGet: vi.fn<(key: string) => Promise<string | null>>(),
    redisSet: vi.fn<(key: string, value: string, options: { expiration: Date }) => Promise<void>>(),
    settingsGet: vi.fn<(key: AppSetting) => Promise<string | undefined>>(),
}));

vi.mock("@devvit/web/server", () => ({
    redis: {
        get: devvitMocks.redisGet,
        set: devvitMocks.redisSet,
    },
    settings: {
        get: devvitMocks.settingsGet,
    },
}));

import { getChannelData, getVideoData, parseYoutubeUrlFromText } from "./youtubeData.js";

describe("parseYoutubeUrlFromText", () => {
    it("extracts video IDs from youtube.com, youtu.be, and shorts URLs", () => {
        const text = [
            "Watch this: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "And this one: https://youtu.be/3JZ_D3ELwOQ",
            "Shorts link: https://www.youtube.com/shorts/9bZkp7q19f0",
        ].join("\n");

        const videoIds = parseYoutubeUrlFromText(text);

        assert.deepEqual(videoIds, ["dQw4w9WgXcQ", "3JZ_D3ELwOQ", "9bZkp7q19f0"]);
    });

    it("returns an empty array when there are no YouTube URLs", () => {
        const videoIds = parseYoutubeUrlFromText("no links here");

        assert.deepEqual(videoIds, []);
    });

    it("returns unique IDs when the same video URL appears multiple times", () => {
        const text = [
            "First: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "Duplicate short URL: https://youtu.be/dQw4w9WgXcQ",
            "Different video: https://youtu.be/3JZ_D3ELwOQ",
            "Duplicate standard URL: https://youtube.com/watch?v=3JZ_D3ELwOQ",
            "Shorts duplicate: https://www.youtube.com/shorts/3JZ_D3ELwOQ",
        ].join("\n");

        const videoIds = parseYoutubeUrlFromText(text);

        assert.deepEqual(videoIds, ["dQw4w9WgXcQ", "3JZ_D3ELwOQ"]);
    });
});

describe("getVideoData", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        devvitMocks.redisGet.mockReset();
        devvitMocks.redisSet.mockReset();
        devvitMocks.settingsGet.mockReset();
    });

    it("returns cached videos without calling YouTube API", async () => {
        const publishedAt = new Date("2020-01-01T00:00:00Z").getTime();
        const cachedVideo = {
            id: "dQw4w9WgXcQ",
            title: "Cached title",
            description: "Cached description",
            channelId: "UC38IQsAvIsxxjztdMZQtwHA",
            channelTitle: "Cached channel",
            publishedAt,
            viewCount: 10,
            likeCount: 9,
            dislikeCount: 0,
            commentCount: 1,
            duration: {
                hours: 0,
                minutes: 3,
                seconds: 32,
            },
        };
        devvitMocks.redisGet.mockResolvedValue(JSON.stringify(cachedVideo));

        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const results = await getVideoData([cachedVideo.id]);

        assert.deepEqual(results, { [cachedVideo.id]: cachedVideo });
        assert.equal(fetchMock.mock.calls.length, 0);
        assert.equal(devvitMocks.settingsGet.mock.calls.length, 0);
        assert.equal(devvitMocks.redisSet.mock.calls.length, 0);
    });

    it("fetches missing videos and writes them to cache", async () => {
        const cachedVideoId = "dQw4w9WgXcQ";
        const fetchedVideoId = "3JZ_D3ELwOQ";
        const cachedPublishedAt = new Date("2020-01-01T00:00:00Z").getTime();
        const fetchedPublishedAt = new Date("2021-01-01T00:00:00Z").getTime();

        devvitMocks.redisGet.mockImplementation((key: string) => {
            if (key === `videoData:${cachedVideoId}`) {
                return Promise.resolve(JSON.stringify({
                    id: cachedVideoId,
                    title: "Cached title",
                    description: "Cached description",
                    channelId: "UCcached",
                    channelTitle: "Cached channel",
                    publishedAt: cachedPublishedAt,
                    viewCount: 10,
                    likeCount: 9,
                    dislikeCount: 0,
                    commentCount: 1,
                    duration: {
                        hours: 0,
                        minutes: 3,
                        seconds: 32,
                    },
                }));
            }

            return Promise.resolve(null);
        });
        devvitMocks.settingsGet.mockResolvedValue("test-api-key");

        const apiPayload = {
            items: [
                {
                    id: fetchedVideoId,
                    snippet: {
                        title: "Fetched title",
                        description: "Fetched description",
                        channelId: "UCfetched",
                        channelTitle: "Fetched channel",
                        publishedAt: "2021-01-01T00:00:00Z",
                    },
                    statistics: {
                        viewCount: "100",
                        likeCount: "50",
                        dislikeCount: "1",
                        commentCount: "7",
                    },
                    contentDetails: {
                        duration: "PT1H2M3S",
                    },
                },
            ],
        };

        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(apiPayload), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        const results = await getVideoData([cachedVideoId, fetchedVideoId]);

        assert.equal(devvitMocks.settingsGet.mock.calls.length, 1);
        assert.deepEqual(devvitMocks.settingsGet.mock.calls[0], [AppSetting.YoutubeAPIKey]);
        assert.equal(fetchMock.mock.calls.length, 1);

        const [requestCall] = fetchMock.mock.calls;
        assert.ok(requestCall);
        const requestUrl = new URL(String(requestCall[0]));
        assert.equal(requestUrl.searchParams.get("id"), fetchedVideoId);
        assert.equal(requestUrl.searchParams.get("key"), "test-api-key");

        const cachedVideo = results[cachedVideoId];
        const fetchedVideo = results[fetchedVideoId];
        assert.ok(cachedVideo);
        assert.ok(fetchedVideo);
        assert.equal(cachedVideo.title, "Cached title");
        assert.equal(cachedVideo.publishedAt, cachedPublishedAt);
        assert.equal(fetchedVideo.publishedAt, fetchedPublishedAt);
        assert.equal(fetchedVideo.viewCount, 100);
        assert.deepEqual(fetchedVideo.duration, {
            hours: 1,
            minutes: 2,
            seconds: 3,
        });

        assert.equal(devvitMocks.redisSet.mock.calls.length, 1);
        const [setCall] = devvitMocks.redisSet.mock.calls;
        assert.ok(setCall);
        assert.equal(setCall[0], `videoData:${fetchedVideoId}`);
        const cacheOptions = setCall[2];
        assert.ok(cacheOptions.expiration instanceof Date);
    });

    it("throws when API key is missing", async () => {
        devvitMocks.redisGet.mockResolvedValue(null);
        devvitMocks.settingsGet.mockResolvedValue(undefined);
        vi.stubGlobal("fetch", vi.fn());

        await assert.rejects(
            getVideoData(["dQw4w9WgXcQ"]),
            /YouTube API key not set in app settings/,
        );
    });

    it("throws when YouTube API returns an error", async () => {
        devvitMocks.redisGet.mockResolvedValue(null);
        devvitMocks.settingsGet.mockResolvedValue("test-api-key");
        const fetchMock = vi.fn().mockResolvedValue(new Response("something bad", { status: 500 }));
        vi.stubGlobal("fetch", fetchMock);

        await assert.rejects(getVideoData(["dQw4w9WgXcQ"]), /YouTube API error: something bad/);
        assert.equal(fetchMock.mock.calls.length, 1);
    });
});

describe("getChannelData", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        devvitMocks.redisGet.mockReset();
        devvitMocks.redisSet.mockReset();
        devvitMocks.settingsGet.mockReset();
    });

    it("returns cached channels without calling YouTube API", async () => {
        const cachedChannel = {
            id: "UC123456789",
            title: "Cached channel",
            description: "Cached description",
            subscriberCount: 1000,
            videoCount: 20,
        };
        devvitMocks.redisGet.mockResolvedValue(JSON.stringify(cachedChannel));
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const results = await getChannelData([cachedChannel.id]);

        assert.deepEqual(results, { [cachedChannel.id]: cachedChannel });
        assert.equal(fetchMock.mock.calls.length, 0);
        assert.equal(devvitMocks.settingsGet.mock.calls.length, 0);
    });

    it("fetches missing channels and writes them to cache", async () => {
        const cachedChannelId = "UC123456789";
        const fetchedChannelId = "UC987654321";

        devvitMocks.redisGet.mockImplementation((key: string) => {
            if (key === `channelData:${cachedChannelId}`) {
                return Promise.resolve(JSON.stringify({
                    id: cachedChannelId,
                    title: "Cached channel",
                    description: "Cached description",
                    subscriberCount: 10,
                    videoCount: 2,
                }));
            }

            return Promise.resolve(null);
        });
        devvitMocks.settingsGet.mockResolvedValue("test-api-key");

        const apiPayload = {
            items: [
                {
                    id: fetchedChannelId,
                    statistics: {
                        subscriberCount: "42",
                        videoCount: "7",
                    },
                    brandingSettings: {
                        channel: {
                            title: "Fetched channel",
                            description: "Fetched description",
                        },
                    },
                },
            ],
        };

        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(apiPayload), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        const results = await getChannelData([cachedChannelId, fetchedChannelId]);

        assert.equal(fetchMock.mock.calls.length, 1);
        const [requestCall] = fetchMock.mock.calls;
        assert.ok(requestCall);
        const requestUrl = new URL(String(requestCall[0]));
        assert.equal(requestUrl.searchParams.get("id"), fetchedChannelId);
        assert.equal(requestUrl.searchParams.get("key"), "test-api-key");

        const cachedChannel = results[cachedChannelId];
        const fetchedChannel = results[fetchedChannelId];
        assert.ok(cachedChannel);
        assert.ok(fetchedChannel);
        assert.equal(cachedChannel.title, "Cached channel");
        assert.equal(fetchedChannel.subscriberCount, 42);
        assert.equal(fetchedChannel.videoCount, 7);

        assert.equal(devvitMocks.redisSet.mock.calls.length, 1);
        const [setCall] = devvitMocks.redisSet.mock.calls;
        assert.ok(setCall);
        assert.equal(setCall[0], `channelData:${fetchedChannelId}`);
        const cacheOptions = setCall[2];
        assert.ok(cacheOptions.expiration instanceof Date);
    });

    it("throws when YouTube API returns an error", async () => {
        devvitMocks.redisGet.mockResolvedValue(null);
        devvitMocks.settingsGet.mockResolvedValue("test-api-key");
        const fetchMock = vi.fn().mockResolvedValue(new Response("channel error", { status: 500 }));
        vi.stubGlobal("fetch", fetchMock);

        await assert.rejects(getChannelData(["UC123456789"]), /YouTube API error: channel error/);
        assert.equal(fetchMock.mock.calls.length, 1);
    });
});
