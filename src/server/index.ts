import { Hono } from "hono";
import { createServer, getServerPort } from "@devvit/web/server";
import { getRequestListener } from "@hono/node-server";
import { handleAppInstall, handleAppUpgrade, handleCommentCreate, handlePostCreate } from "./triggers";
import { handleSelectFieldHasOptionChosen, handleValidateDuration, handleValidateHashtags } from "./validators";

const application = new Hono();

// Triggers
application.post("/internal/triggers/on-app-install", handleAppInstall);
application.post("/internal/triggers/on-app-upgrade", handleAppUpgrade);
application.post("/internal/triggers/on-post-create", handlePostCreate);
application.post("/internal/triggers/on-comment-create", handleCommentCreate);

// Settings validators
application.post("/internal/validators/select-field-has-option-chosen", handleSelectFieldHasOptionChosen);
application.post("/internal/validators/validate-hashtags", handleValidateHashtags);
application.post("/internal/validators/validate-duration", handleValidateDuration);

const server = createServer(getRequestListener(application.fetch));
server.on("error", (err) => {
    console.error(`server error; ${err.stack}`);
});

const port = getServerPort();
server.listen(port);
