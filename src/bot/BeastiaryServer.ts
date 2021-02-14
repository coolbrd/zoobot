import { stripIndent } from "common-tags";
import { EventEmitter } from "events";
import express from "express";
import { NGROK_AUTH, WEBSERVER_PORT } from "../config/secrets";
import ngrok from "ngrok";

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

    private async startNgrok(): Promise<void> {
        try {
            await ngrok.authtoken(NGROK_AUTH);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error setting the authorization token for Ngrok.

                ${error}
            `);
        }

        try {
            await ngrok.connect({
                addr: this.port,
                subdomain: "thebeastiary"
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error connecting to Ngrok.

                ${error}
            `);
        }
    }

    public async start(): Promise<void> {
        const returnPromises: Promise<void>[] = [];
        
        returnPromises.push(this.startWebServer());

        returnPromises.push(this.startNgrok());

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