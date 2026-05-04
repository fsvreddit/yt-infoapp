import { Comment, context, Post, reddit } from "@devvit/web/server";
import { isT1, T1, T3 } from "@devvit/web/shared";

export function getBotCommentFooter (): string {
    return `*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](https://www.reddit.com/r/${context.subredditName}/about/moderators) if you have any questions or concerns.*`;
}

export async function getPostOrCommentById (id: T1 | T3): Promise<Post | Comment> {
    if (isT1(id)) {
        return await reddit.getCommentById(id);
    } else {
        return await reddit.getPostById(id);
    }
}
