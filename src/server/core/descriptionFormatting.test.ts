import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatVideoDescriptionForInfoComment } from "./descriptionFormatting.js";

describe("formatVideoDescriptionForInfoComment", () => {
    it("preserves full links when redaction is disabled", () => {
        const description = "Donate *now*: https://cash.app/$ExampleUser";

        const result = formatVideoDescriptionForInfoComment(description, false);

        assert.equal(result, "Donate \\*now\\*: https://cash.app/$ExampleUser");
    });

    it("does not treat bare domains as links when redaction is disabled", () => {
        const description = "Donate at cash.app/$ExampleUser";

        const result = formatVideoDescriptionForInfoComment(description, false);

        assert.equal(result, "Donate at cash\\.app/$ExampleUser");
    });

    it("redacts full links to domain placeholders when redaction is enabled", () => {
        const description = [
            "Donate: https://cash.app/$ExampleUser",
            "Backup: https://paypal.me/ExampleUser?locale.x=en_US",
            "Links: https://linktr.ee/example-user",
        ].join("\n");

        const result = formatVideoDescriptionForInfoComment(description, true);

        assert.equal(result, [
            "Donate: [redacted link: cash.app]",
            "Backup: [redacted link: paypal.me]",
            "Links: [redacted link: linktr.ee]",
        ].join("\n"));
    });

    it("redacts www links and bare domains with paths", () => {
        const description = "More links: www.example.com/page and cash.app/$ExampleUser";

        const result = formatVideoDescriptionForInfoComment(description, true);

        assert.equal(result, "More links: [redacted link: example.com] and [redacted link: cash.app]");
    });

    it("does not redact bare domains without paths", () => {
        const description = "This mentions example.com but does not include a path.";

        const result = formatVideoDescriptionForInfoComment(description, true);

        assert.equal(result, "This mentions example\\.com but does not include a path\\.");
    });

    it("escapes non-link Markdown when links are redacted", () => {
        const description = "**Donate** at https://cash.app/$ExampleUser!";

        const result = formatVideoDescriptionForInfoComment(description, true);

        assert.equal(result, "\\*\\*Donate\\*\\* at [redacted link: cash.app]\\!");
    });
});
