import { stripIndent } from "common-tags";
import fetch from "node-fetch";
import { inspect } from "util";
import { BeastiaryServer } from "../../bot/BeastiaryServer";
import MasterBeastiaryProcess from "../../bot/MasterBeastiaryProcess";

interface StatPostBody {
    [statName: string]: number
}

interface NestedResponse {
    [path: string]: string | NestedResponse
}

export default abstract class BotList {
    protected abstract readonly APIpath: string;
    protected abstract readonly APItoken: string;
    protected abstract readonly guildCountPropertyName?: string;
    protected abstract readonly shardCountPropertyName?: string;
    protected abstract readonly userCountPropertyName?: string;

    protected abstract readonly webhookName: string;
    protected abstract readonly webhookAuth: string;
    protected abstract readonly webhookUserIdPropertyName: string | string[];
    protected abstract readonly webhookVoteEventName: string;

    private getAPIpath(id: string): string {
        return this.APIpath.replace(":id", id);
    }

    private async buildBody(masterProcess: MasterBeastiaryProcess): Promise<StatPostBody> {
        const stats = {};

        if (this.guildCountPropertyName) {
            Object.defineProperty(stats, this.guildCountPropertyName, {
                value: await masterProcess.getGuildCount(),
                writable: false,
                enumerable: true
            });
        }

        if (this.shardCountPropertyName) {
            Object.defineProperty(stats, this.shardCountPropertyName, {
                value: await masterProcess.getShardCount(),
                writable: false,
                enumerable: true
            });
        }

        if (this.userCountPropertyName) {
            Object.defineProperty(stats, this.userCountPropertyName, {
                value: await masterProcess.getUserCount(),
                writable: false,
                enumerable: true
            });
        }

        return stats;
    }

    private async postStats(masterProcess: MasterBeastiaryProcess): Promise<void> {
        const statBody = await this.buildBody(masterProcess);

        try {
            await fetch(this.getAPIpath(masterProcess.clientId), {
                method: "POST",
                headers: {
                    "authorization": this.APItoken,
                    "Content-type": "application/json"
                },
                body: JSON.stringify(statBody)
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error posting stats to a bot list.

                ${error}
            `);
        }
    }

    private initializeStatsAutoPost(masterProcess: MasterBeastiaryProcess): void {
        this.postStats(masterProcess);
        setInterval(() => {
            this.postStats(masterProcess)
        }, 300000);
    }

    private getUserIdFromBody(body: NestedResponse): string {
        let propertyChain: string[];
        if (typeof this.webhookUserIdPropertyName === "string") {
            propertyChain = [this.webhookUserIdPropertyName];
        }
        else {
            propertyChain = Array.from(this.webhookUserIdPropertyName);
        }

        let field: NestedResponse | string = body;
        while (propertyChain.length > 0 && typeof field !== "string") {
            const fieldName = propertyChain.shift() as string;
            field = field[fieldName];
        }

        if (!field || typeof field !== "string") {
            throw new Error(stripIndent`
                A non-string value was found in the body of a response where an id was expected.

                Value: ${field}
                Field chain: ${this.webhookUserIdPropertyName}
                Whole body: ${inspect(body)}
            `);
        }

        return field;
    }

    private registerWebhook(server: BeastiaryServer): void {
        server.app.post(`/${this.webhookName}`, (req, res) => {
            if (req.headers['authorization'] !== this.webhookAuth) {
                res.status(401);
                delete req.headers['authorization'];
                console.error(stripIndent`
                    Received ${this.webhookName} POST without proper authentication.

                    Body: ${inspect(req.body)}
                `);
            }
            delete req.headers['authorization'];
            res.status(200).send();

            const id = this.getUserIdFromBody(req.body);

            if (id.length === 18) {
                server.emit(this.webhookVoteEventName, id);
            }
        });
    }

    public init(masterProcess: MasterBeastiaryProcess): void {
        this.initializeStatsAutoPost(masterProcess);
        this.registerWebhook(masterProcess.server);
    }
}