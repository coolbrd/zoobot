/* eslint-disable @typescript-eslint/no-var-requires */
import { stripIndent } from "common-tags";
import { ShardClientUtil } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";

export default class ShardManager {
    private readonly beastiaryClient: BeastiaryClient;
    private readonly shard: ShardClientUtil;

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;

        if (!beastiaryClient.discordClient.shard) {
            throw new Error("A Beastiary client with a Discord client with no shard was given to a ShardManager.");
        }

        this.shard = beastiaryClient.discordClient.shard;

        this.shard.client.on("announcementMessage", text => {
            this.beastiaryClient.beastiary.playerGuilds.announceToAll(text);
        });

        this.shard.client.on("vote", (userId: string, voteReward: number) => {
            this.beastiaryClient.beastiary.players.handleVote(userId, voteReward);
        });
    }

    public async getIdType(id: string): Promise<"user" | "guild" | "unknown"> {
        let resultPromises: Promise<"user" | "guild" | "unknown">[];
        try {
            resultPromises = await this.shard.broadcastEval(`
                (async () => {
                    const idUtility = require("../../../../build/discordUtility/idUtility");

                    let result;
                    try {
                        result = await idUtility.getIdType("${id}", this);
                    }
                    catch (error) {
                        throw new Error(\`There was an error getting the id type of an id across shards.\\n\\n\${error}\`);
                    }
                    return result;
                })()
            `);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error broadcasting an id evaluation across shards.

                ${error}
            `);
        }

        const results = await Promise.all(resultPromises);

        const definitiveResult = results.find(result => result !== "unknown");

        if (definitiveResult) {
            return definitiveResult;
        }
        else return "unknown";
    }

    public announce(text: string): void {
        this.shard.broadcastEval(`
            this.emit("announcementMessage", \`${text}\`);
        `);
    }
}