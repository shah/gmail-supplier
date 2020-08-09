import { gmail_v1, google } from "googleapis";
import * as gmail from "./gmail";
import * as gaa from "@shah/googleapis-auth";

const apiAuth = gaa.authorize(".secrets/api-access.json", new gaa.LocalFileCliCache(".secrets/stored-oauth-tokens.json"));
if (gaa.isGoogleApiAuthorized(apiAuth)) {
    const gmailAPI = google.gmail({ version: "v1", auth: apiAuth.authorizedApiClient });
    const supplier = new gmail.GmailMessagesSupplier(gmailAPI, {});
    const sync = async (): Promise<void> => {
        await supplier.cacheUserLabels();
        console.dir(supplier.labels)
        supplier.previewEach((message: gmail_v1.Schema$Message): void => {
            console.dir(message);
        });
    }
    sync();
} else {
    console.error("Google API access not authorized.");
}
