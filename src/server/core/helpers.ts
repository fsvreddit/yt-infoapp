import { context } from "@devvit/web/server";

export function getBotCommentFooter (): string {
    return `*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](https://www.reddit.com/r/${context.subredditName}/about/moderators) if you have any questions or concerns.*`;
}
