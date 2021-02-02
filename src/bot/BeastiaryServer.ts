import { stripIndent } from "common-tags";
import { EventEmitter } from "events";
import express from "express";
import localtunnel from "localtunnel";
import { WEBSERVER_PORT } from "../config/secrets";

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
        return new Promise<void>(resolve => {
            const tunnel = localtunnel(this.port, { subdomain: "thebeastiary" }, error => {
                if (error) {
                    console.error(stripIndent`
                        There was an error initializing localtunnel.
            
                        ${error}
                    `);
                }

                resolve();
            });

            tunnel.on("error", () => {
                console.log("Reconnecting to localtunnel...");

                setTimeout(() => {
                    tunnel.close();

                    this.startLocalTunnel();
                }, 30 * 1000);
            });
        });
    }

    public async start(): Promise<void> {
        const returnPromises: Promise<void>[] = [];
        
        returnPromises.push(this.startWebServer());
        returnPromises.push(this.startLocalTunnel());

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