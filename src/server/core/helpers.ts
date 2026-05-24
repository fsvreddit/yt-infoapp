import { context } from "@devvit/web/server";
import { OnCommentCreateRequest, OnPostCreateRequest, T1, T3 } from "@devvit/web/shared";
import { getPostOrCommentById } from "@fsvreddit/fsv-devvit-web-helpers";

export function getBotCommentFooter (): string {
    return `*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](https://www.reddit.com/r/${context.subredditName}/about/moderators) if you have any questions or concerns.*`;
}

export async function fixContentCreationRequest<T extends OnPostCreateRequest | OnCommentCreateRequest> (request: T): Promise<T> {
    const requestToReturn = { ...request };

    if (!requestToReturn.author) {
        return requestToReturn;
    }

    if (requestToReturn.author.name !== "[redacted]") {
        return requestToReturn;
    }

    let targetId: T1 | T3;

    if ("comment" in request && request.comment) {
        targetId = request.comment.id as T1;
    } else if ("post" in request && request.post) {
        targetId = request.post.id as T3;
    } else {
        return requestToReturn;
    }

    const target = await getPostOrCommentById(targetId);
    requestToReturn.author.name = target.authorName;

    if ("comment" in requestToReturn && requestToReturn.comment && target.authorId) {
        requestToReturn.comment.author = target.authorId;
        requestToReturn.comment.body = target.body ?? "";
    } else if ("post" in requestToReturn && requestToReturn.post && target.authorId) {
        requestToReturn.post.authorId = target.authorId;
        requestToReturn.post.selftext = target.body ?? "";
    }

    return requestToReturn;
}
