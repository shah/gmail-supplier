import { gmail_v1, google } from "googleapis";
import * as gmail from "./gmail";
import * as gapis from "./googleapis-auth";

const apiAuth = gapis.authorize();
if (gapis.isGoogleApiAuthorized(apiAuth)) {
    process.stdout.write("message_id,from_address,from_name,date,subject,labels,html_base64_length,html_length\n");
    const gmailAPI = google.gmail({ version: "v1", auth: apiAuth.authorizedApiClient });
    const supplier = new gmail.GmailMessagesSupplier(gmailAPI, {
        labelsToCache: (label: gmail_v1.Schema$Label): boolean => {
            // we only care about the 'read' status in messages so ignore the rest of Gmail labels
            return label.name === "UNREAD";
        }
    });
    supplier.forEachSync((gm: gmail.GmailMessage): void => {
        process.stdout.write(`${gm.message.id},"${gm.from.address}","${gm.from.name}",`);
        process.stdout.write(`${gm.date?.toISOString()},"${gm.subject}","${gm.labels.join(',')}",`);
        gm.handleHtmlBase64Encoded((base64Content: string): boolean => {
            process.stdout.write(`${base64Content.length}`);
            return false; // we only handle the first one, abandon any others
        })
        process.stdout.write(',');
        gm.handleHtmlContent((html: string): boolean => {
            process.stdout.write(`${html.length}`);
            return false; // we only handle the first one, abandon any others
        })
        process.stdout.write("\n");
    });
}
