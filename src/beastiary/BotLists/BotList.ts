import { stripIndent } from "common-tags";
import fetch from "node-fetch";
import { inspect } from "util";
import { BeastiaryServer } from "../../bot/BeastiaryServer";
import MasterBeastiaryProcess from "../../bot/MasterBeastiaryProcess";

interface StatPostBody {
    [statName: string]: number
}

export default abstract class BotList {
    protected abstract readonly APIpath: string;
    protected abstract readonly APItoken: string;
    protected abstract readonly guildCountPropertyName?: string;
    protected abstract readonly shardCountPropertyName?: string;
    protected abstract readonly userCountPropertyName?: string;

    protected abstract readonly webhookName: string;
    protected abstract readonly webhookAuth: string;
    protected abstract readonly webhookUserIdPropertyName: string;
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

    public initializeStatsAutoPost(masterProcess: MasterBeastiaryProcess): void {
        this.postStats(masterProcess);
        setInterval(() => {
            this.postStats(masterProcess)
        }, 300000);
    }

    public registerWebhook(server: BeastiaryServer): void {
        server.app.post(`/${this.webhookName}`, (req, res) => {
            console.log("Received webhook POST");
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

            if (typeof req.body[this.webhookUserIdPropertyName] === "string" && req.body[this.webhookUserIdPropertyName].length === 18) {
                server.emit(this.webhookVoteEventName, req.body[this.webhookUserIdPropertyName]);
            }
        });
    }
}