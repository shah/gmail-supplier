import * as addrs from "email-addresses";
import { gmail_v1 } from "googleapis";

export type GmailLabelName = string;
export type GmailMessageSubject = string;
export type GmailMessageHeaderValue = string;
export type GMailUserID = string;

export interface GmailMessageHandler {
    (message: GmailMessage): Promise<void> | void;
}

export interface GmailMessagePreviewHandler {
    (message: gmail_v1.Schema$Message): void;
}

export interface GmailMessagePartBodyHandler {
    (body: gmail_v1.Schema$MessagePartBody): boolean;
}

export interface GmailMessageBodyBase64EncodedContentHandler {
    (base64Content: string): boolean;
}

export interface GmailMessageBodyContentHandler {
    (content: string): boolean;
}

export class GmailMessage {
    readonly date: Date | undefined;
    readonly subject: GmailMessageSubject;
    readonly headers: { [key: string]: GmailMessageHeaderValue } = {};
    readonly from: addrs.ParsedMailbox;

    constructor(readonly supplier: GmailMessagesSupplier, readonly message: gmail_v1.Schema$Message) {
        message.payload!.headers?.forEach((header) => {
            this.headers[header.name!] = header.value!
        });
        const fromAddrs = addrs.parseFrom(this.headers.From.trim());
        if (fromAddrs.length == 1) {
            const result = fromAddrs[0];
            if ("address" in result) {
                this.from = result;
            } else {
                this.from = addrs.parseSender("unkown@unparseable.email") as addrs.ParsedMailbox;
            }
        } else {
            this.from = addrs.parseSender(`${fromAddrs.length}@unparseable-multiple.email`) as addrs.ParsedMailbox;
        }
        this.date = new Date(this.headers.Date);
        this.subject = this.headers.Subject;
    }

    handlePart(mimeType: string, handler: GmailMessagePartBodyHandler): void {
        let abandon = false;
        this.message.payload?.parts?.forEach((part) => {
            if (abandon) return;
            if (part.body?.data && part.mimeType == mimeType) {
                abandon = !(handler(part.body!));
            }
        })
    }

    handleTextBase64Encoded(handler: GmailMessageBodyBase64EncodedContentHandler): void {
        this.handlePart("text/plain", (body: gmail_v1.Schema$MessagePartBody): boolean => {
            return handler(body.data!);
        });
    }

    handleHtmlBase64Encoded(handler: GmailMessageBodyBase64EncodedContentHandler): void {
        this.handlePart("text/html", (body: gmail_v1.Schema$MessagePartBody): boolean => {
            return handler(body.data!);
        });
    }

    handleTextContent(handler: GmailMessageBodyContentHandler): void {
        this.handlePart("text/plain", (body: gmail_v1.Schema$MessagePartBody): boolean => {
            return handler(Buffer.from(body.data!, 'base64').toString());
        });
    }

    handleHtmlContent(handler: GmailMessageBodyContentHandler): void {
        this.handlePart("text/html", (body: gmail_v1.Schema$MessagePartBody): boolean => {
            return handler(Buffer.from(body.data!, 'base64').toString());
        });
    }

    get labels(): GmailLabelName[] {
        const result: GmailLabelName[] = [];
        this.message.labelIds?.forEach(async (labelId) => {
            const gmailLabel = this.supplier.labels[labelId];
            if (gmailLabel) {
                result.push(gmailLabel.name!);
            }
        });
        return result;
    }
}

export interface GmailMessagesSupplierLabelsFilter {
    (label: gmail_v1.Schema$Label): boolean;
}

export interface GmailMessagesSupplierOptions {
    readonly userId?: GMailUserID;
}

export class GmailMessagesSupplier {
    readonly labels: { [labelId: string]: gmail_v1.Schema$Label } = {};
    readonly userId: GMailUserID;

    constructor(readonly gmailAPI: gmail_v1.Gmail,
        { userId }: GmailMessagesSupplierOptions) {
        this.userId = userId || "me";
    }

    async cacheUserLabels(labelsToCache?: GmailMessagesSupplierLabelsFilter): Promise<void> {
        await this.gmailAPI.users.labels.list({ userId: this.userId })
            .then((res) => {
                const messageLabelsForUserID = res.data.labels;
                if (messageLabelsForUserID?.length) {
                    if (labelsToCache) {
                        messageLabelsForUserID.forEach(async (label) => {
                            if (labelsToCache(label)) {
                                this.labels[label.id!] = label;
                            }
                        });
                    } else {
                        messageLabelsForUserID.forEach(async (label) => {
                            this.labels[label.id!] = label;
                        });
                    }
                }
            }).catch((reason) => console.error("users.labels.list() API returned an error: " + reason))
    }

    protected async forEachMessagePreview(gmph: GmailMessagePreviewHandler, pageNumber: number, pageToken?: string): Promise<void> {
        const self = this;
        await this.gmailAPI.users.messages.list({ userId: this.userId, pageToken: pageToken })
            .then(async (response) => {
                const messages = response.data.messages;
                if (messages && messages.length) {
                    messages.map((async (message) => {
                        gmph(message);
                    }));
                }
                if (response.data.nextPageToken) {
                    await this.forEachMessagePreview(gmph, pageNumber + 1, response.data.nextPageToken);
                }
            }).catch((reason) => { console.log("users.messages.list() API returned an error: " + reason) })
    }

    previewEach(gmph: GmailMessagePreviewHandler): void {
        this.forEachMessagePreview(gmph, 0);
    }

    protected async forEachMessage(gmh: GmailMessageHandler, pageNumber: number, pageToken?: string): Promise<void> {
        const self = this;
        await this.gmailAPI.users.messages.list({ userId: this.userId, pageToken: pageToken })
            .then(async (response) => {
                const messages = response.data.messages;
                if (messages && messages.length) {
                    await Promise.all(messages.map((async (message) => {
                        await this.gmailAPI.users.messages.get({
                            userId: this.userId,
                            id: message.id!,
                            format: "full",
                        }).then(async (res) => {
                            const gm = new GmailMessage(this, res?.data!);
                            await gmh(gm);
                        }).catch((reason) => { console.log("users.messages.get() API returned an error: " + reason) })
                    })));
                }
                if (response.data.nextPageToken) {
                    await this.forEachMessage(gmh, pageNumber + 1, response.data.nextPageToken);
                }
            }).catch((reason) => { console.log("users.messages.list() API returned an error: " + reason) })
    }

    async forEach(gmh: GmailMessageHandler): Promise<void> {
        await this.forEachMessage(gmh, 0);
    }
}