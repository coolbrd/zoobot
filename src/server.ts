import { stripIndent } from "common-tags";
import { EventEmitter } from "events";
import express from "express";
import localtunnel from "localtunnel";
import { inspect } from "util";
import { DBL_WEBHOOK_SECRET, IBL_WEBHOOK_SECRET, VULTREX_WEBHOOK_TOKEN, WEBSERVER_PORT } from "./config/secrets";

export class BeastiaryServer extends EventEmitter {
    public readonly app = express();
    public readonly port: number;

    constructor(port?: number) {
        super();

        this.port = port || WEBSERVER_PORT;

        this.app.use(express.json());
    }

    private async startWebServer(): Promise<void> {
        return new Promise<void>(resolve => {
            this.app.listen(this.port, () => {
                resolve();
                console.log(`HTTP server listening on port ${this.port}.`);
            });
        });
    }

    private startLocalTunnel(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            localtunnel(this.port, { subdomain: "thebeastiary" }, error => {
                if (error) {
                    reject(stripIndent`
                        There was an error initializing localtunnel.
            
                        ${error}
                    `);
                }

                resolve();
            });
        });
    }

    private registerWebhook(webhookName: string, eventName: string, auth: string, idPropertyName: string): void {
        this.app.post(`/${webhookName}`, (req, res) => {
            if (req.headers['authorization'] !== auth) {
                res.status(401);
                delete req.headers['authorization'];
                console.error(stripIndent`
                    Received ${webhookName} POST without proper authentication.

                    Body: ${inspect(req.body)}
                `);
            }
            delete req.headers['authorization'];
            res.status(200).send();

            if (typeof req.body[idPropertyName] === "string" && req.body[idPropertyName].length === 18) {
                this.emit(eventName, req.body[idPropertyName]);
            }
        });
    }

    public async start(): Promise<void> {
        const returnPromises: Promise<void>[] = [];
        
        returnPromises.push(this.startWebServer());
        returnPromises.push(this.startLocalTunnel());

        this.registerWebhook("IBLhook", "vote", IBL_WEBHOOK_SECRET, "userID");
        this.registerWebhook("DBLhook", "vote", DBL_WEBHOOK_SECRET, "id");
        this.registerWebhook("vultrexHook", "vote", VULTREX_WEBHOOK_TOKEN, "userId");

        try {
            await Promise.all(returnPromises);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error initializing the public webserver.

                ${error}
            `);
        }
    }
}