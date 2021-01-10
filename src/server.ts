import { stripIndent } from "common-tags";
import { EventEmitter } from "events";
import express from "express";
import localtunnel from "localtunnel";
import { inspect } from "util";
import { IBLwebAuth, webserverPort } from "./config/secrets";

export class BeastiaryServer extends EventEmitter {
    public readonly app = express();
    public readonly port: number;

    constructor(port?: number) {
        super();

        this.port = port || webserverPort;

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

    private registerIBLWebhook(): void {
        this.app.post("/IBLhook", (req, res) => {
            if (req.headers['authorization'] !== IBLwebAuth) {
                res.status(401);
                delete req.headers['authorization'];
                console.error(stripIndent`
                    Received IBLhook POST without proper authentication.

                    Body: ${inspect(req.body)}
                `);
            }
            delete req.headers['authorization'];
            res.status(200).send();

            if (typeof req.body.userID === "string" && req.body.userID.length === 18) {
                this.emit("IBLvote", req.body.userID);
            }
        });
    }

    public async start(): Promise<void> {
        const returnPromises: Promise<void>[] = [];
        
        returnPromises.push(this.startWebServer());
        returnPromises.push(this.startLocalTunnel());
        this.registerIBLWebhook();

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