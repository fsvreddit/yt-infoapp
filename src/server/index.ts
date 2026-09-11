import { Hono } from "hono";
import { createServer, getServerPort } from "@devvit/web/server";
import { getRequestListener } from "@hono/node-server";
import { handleAppInstall, handleAppUpgrade, handleCommentCreate, handleModAction, handlePostCreate } from "./triggers";
import { handleNumberFieldIsZeroOrHigher, handleSelectFieldHasOptionChosen, handleValidateDuration, handleValidateHashtags } from "./validators";
import { handleUpgradeNotifier } from "@fsvreddit/fsv-devvit-web-helpers";

const application = new Hono();

// Triggers
application.post("/internal/triggers/on-app-install", handleAppInstall);
application.post("/internal/triggers/on-app-upgrade", handleAppUpgrade);
application.post("/internal/triggers/on-post-create", handlePostCreate);
application.post("/internal/triggers/on-comment-create", handleCommentCreate);
application.post("/internal/triggers/on-mod-action", handleModAction);

// Settings validators
application.post("/internal/validators/number-field-is-zero-or-higher", handleNumberFieldIsZeroOrHigher);
application.post("/internal/validators/select-field-has-option-chosen", handleSelectFieldHasOptionChosen);
application.post("/internal/validators/validate-hashtags", handleValidateHashtags);
application.post("/internal/validators/validate-duration", handleValidateDuration);

// Scheduler jobs
application.post("/internal/tasks/check-for-updates", handleUpgradeNotifier);

const server = createServer(getRequestListener(application.fetch));
server.on("error", (err) => {
    console.error(`server error; ${err.stack}`);
});

const port = getServerPort();
server.listen(port);
