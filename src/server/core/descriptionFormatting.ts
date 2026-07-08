const markdownUrlRegex = /\b((?:https?:\/\/|www\.)[^\s<>()]+)\b/gi;
const redactionUrlRegex = /\b((?:https?:\/\/|www\.)[^\s<>()]+|(?:[a-z0-9-]+\.)+[a-z]{2,63}\/[^\s<>()]+)\b/gi;
const mdSpecials = /([\\`*_{}[\]()#+\-.!])/g;

function escapeMarkdown (input: string): string {
    return input.replace(mdSpecials, "\\$1");
}

function getUrlParts (url: string): { url: string; trailingPunctuation: string } {
    const trailingPunctuationMatch = /[.,!?;:]+$/.exec(url);
    if (!trailingPunctuationMatch) {
        return { url, trailingPunctuation: "" };
    }

    return {
        url: url.slice(0, -trailingPunctuationMatch[0].length),
        trailingPunctuation: trailingPunctuationMatch[0],
    };
}

function getDomainFromUrl (url: string): string {
    const urlWithProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    try {
        const hostname = new URL(urlWithProtocol).hostname.replace(/^www\./i, "").toLowerCase();
        return hostname || "unknown domain";
    } catch {
        return "unknown domain";
    }
}

function getRedactedLinkPlaceholder (url: string): string {
    const urlParts = getUrlParts(url);
    return `[redacted link: ${getDomainFromUrl(urlParts.url)}]${escapeMarkdown(urlParts.trailingPunctuation)}`;
}

/**
 * Escapes video descriptions for Reddit Markdown.
 *
 * When link redaction is enabled, URL-like values are replaced with a domain-level placeholder
 * so usernames, payment handles, referral codes, and full paths are not republished in app comments.
 * Bare domains are redacted only when they include a path, such as cash.app/$handle.
 */
export function formatVideoDescriptionForInfoComment (input: string, redactLinks: boolean): string {
    const urlRegex = redactLinks ? redactionUrlRegex : markdownUrlRegex;
    let result = "";
    let lastIndex = 0;

    input.replace(
        urlRegex,
        (match: string, _url: string, offset: number) => {
            const before = input.slice(lastIndex, offset);
            result += escapeMarkdown(before);
            result += redactLinks ? getRedactedLinkPlaceholder(match) : match;

            lastIndex = offset + match.length;
            return match;
        },
    );

    const rest = input.slice(lastIndex);
    result += escapeMarkdown(rest);

    return result;
}
