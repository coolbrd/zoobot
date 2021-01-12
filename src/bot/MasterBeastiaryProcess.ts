import { stripIndent } from "common-tags";
import Discord, { ShardingManager } from "discord.js";
import mongoose from "mongoose";
import { DISCORD_TOKEN, MONGODB_PATH } from "../config/secrets";
import { BeastiaryServer } from "./BeastiaryServer";
import DatabaseIntegrityChecker from "../structures/DatabaseIntegrityChecker";
import InfinityBotList from "../beastiary/BotLists/Lists/InfinityBotList";
import DiscordBotList from "../beastiary/BotLists/Lists/DiscordBotList";
import VultrexBotList from "../beastiary/BotLists/Lists/VultrexBotList";

export default class MasterBeastiaryProcess {
    private _server: BeastiaryServer | undefined;
    private _shardManager: ShardingManager | undefined;
    private _clientId: string | undefined;

    public get server(): BeastiaryServer {
        if (!this._server) {
            throw new Error("A master Beastiary process' server was attempted to be accessed before it was set.");
        }

        return this._server;
    }

    public get shardManager(): ShardingManager {
        if (!this._shardManager) {
            throw new Error("A master Beastiary process' shard manager was attempted to be accessed before it was set.");
        }

        return this._shardManager;
    }

    public get clientId(): string {
        if (!this._clientId) {
            throw new Error("A master Beastiary process' client id was attempted to be accessed before it was set.");
        }

        return this._clientId;
    }

    private async initializeShards(): Promise<void> {
        this._shardManager = new Discord.ShardingManager("./build/index.js", { respawn: false, token: DISCORD_TOKEN });

        this.shardManager.on("shardCreate", shard => {
            console.log(`- Spawned shard ${shard.id} -`);

            shard.on("message", message => {
                if (message === "exit") {
                    process.exit();
                }
            });
        });

        this.server.on("vote", userId => {
            this.shardManager.broadcastEval(`this.emit("vote", "${userId}")`);
        });

        try {
            await this.shardManager.spawn("auto");
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an erorr spawning a shard.

                ${error}
            `);
        }

        this._clientId = await this.shardManager.fetchClientValues("user.id", 0);
        this._clientId = "737387258683850892";
    }

    public async init(): Promise<void> {
        try {
            await mongoose.connect(MONGODB_PATH, { dbName: "zoobot", useNewUrlParser: true, useUnifiedTopology: true });
        }
        catch (error) {
            throw new Error("Couldn't connect to MongoDB.");
        }

        console.log("Beginning database integrity check");
        const integrityChecker = new DatabaseIntegrityChecker();
        try {
            await integrityChecker.run()
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error running the database integrity check.

                ${error}
            `);
        }

        this._server = new BeastiaryServer();
        try {
            await this.server.start();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error starting The Beastiary's webserver.

                ${error}
            `);
        }

        await this.initializeShards();

        const infinityBotList = new InfinityBotList();
        infinityBotList.init(this);

        const discordBotList = new DiscordBotList();
        discordBotList.init(this);

        const vultrexBotList = new VultrexBotList();
        vultrexBotList.init(this);
    }

    public async getGuildCount(): Promise<number> {
        const counts: number[] = await this.shardManager.broadcastEval(`this.guilds.cache.size`);

        const total = counts.reduce((total, current) => total + current, 0);

        return total;
    }

    public getShardCount(): number {
        return this.shardManager.shards.size;
    }

    public async getUserCount(): Promise<number> {
        const counts: number[] = await this.shardManager.broadcastEval(`this.users.cache.size`);

        const total = counts.reduce((total, current) => total + current, 0);

        return total;
    }
}