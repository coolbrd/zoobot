import mongoose from "mongoose";
import { stripIndent } from "common-tags";
import { Client, Message, ShardClientUtil } from "discord.js";
import Beastiary from "../beastiary/Beastiary";
import { DBL_TOKEN, DISCORD_TOKEN, IBL_TOKEN, MONGODB_PATH, VULTREX_TOKEN } from "../config/secrets";
import InteractiveMessageHandler from "../interactiveMessage/InteractiveMessageHandler";
import CommandHandler from "../structures/Command/CommandHandler";
import { inspect } from "util";
import fetch from "node-fetch";

export default class BeastiaryClient {
    public readonly discordClient: Client;
    public readonly beastiary: Beastiary;
    public readonly commandHandler: CommandHandler;
    public readonly interactiveMessageHandler: InteractiveMessageHandler;

    private readyForInput = false;

    constructor() {
        this.discordClient = new Client();
        this.beastiary = new Beastiary(this);
        this.commandHandler = new CommandHandler(this);
        this.interactiveMessageHandler = new InteractiveMessageHandler(this.discordClient);

        this.init();
    }

    private async init(): Promise<void> {
        const preLoad = {
            connectedToDiscord: false,
            databaseConnected: false,
            guildPrefixesLoaded: false,
            handlersInitialized: false
        }

        const complete = () => {
            if (Object.values(preLoad).every(requirement => requirement)) {
                this.readyForInput = true;
                console.log("Ready for input");
            }
        }

        try {
            await mongoose.connect(MONGODB_PATH, { dbName: "zoobot", useNewUrlParser: true, useUnifiedTopology: true });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error connecting to Mongoose while initializing a BeastiaryClient.

                ${error}
            `);
        }

        console.log("MongoDB connected");

        preLoad.databaseConnected = true;
        complete();

        try {
            await this.commandHandler.loadGuildPrefixes();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading all guild prefixes.
                
                ${error}
            `);
        }

        console.log("Guild prefixes loaded");

        preLoad.guildPrefixesLoaded = true;
        complete();

        this.discordClient.login(DISCORD_TOKEN);

        this.discordClient.on("ready", () => {
            console.log("Logged into Discord");

            if (this.discordClient.user) {
                this.discordClient.user.setActivity("b/commands").catch(error => {
                    throw new Error(stripIndent`
                        There was an error attempting to set a client's activity.

                        ${error}
                    `);
                });
            }

            preLoad.connectedToDiscord = true;
            complete();

            this.beastiary.init().then(() => {
                console.log("Handlers initialized");

                preLoad.handlersInitialized = true;

                complete();
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error initializing a Beastiary's handlers.

                    ${error}
                `);
            });
        });


        this.discordClient.on("message", async (message: Message) => {
            if (!this.readyForInput) {
                return;
            }

            try {
                await this.commandHandler.handleMessage(message);
            }
            catch (error) {
                console.error(stripIndent`
                    There was an error handling a message through the command handler.
                    
                    Message: ${inspect(message)}
                `, error);
            }

            try {
                await this.beastiary.players.handleMessage(message);
            }
            catch (error) {
                console.error(stripIndent`
                    There was an error handling a message through the player manager.
                    
                    Message: ${inspect(message)}
                `, error);
            }

            try {
                await this.beastiary.encounters.handleMessage(message);
            }
            catch (error) {
                console.error(stripIndent`
                    There was an error handling a message through the encounter handler.
                    
                    Message: ${inspect(message)}
                `, error);
            }
        });

        this.discordClient.on("feedbackmessage", (userTag: string, avatarUrl: string, content: string) => {
            if (!this.beastiary.channels.feedbackChannel) {
                return;
            }

            this.beastiary.channels.sendFeedbackMessage(userTag, avatarUrl, content);
        });

        this.discordClient.on("guildCreate", guild => {
            console.log(`Joined guild ${guild.name}. Id: ${guild.id}. Members: ${guild.memberCount}`);
        });

        this.discordClient.on("guildDelete", guild => {
            console.log(`Kicked from guild ${guild.name}. Id: ${guild.id}. Members: ${guild.memberCount}`);
        });

        this.discordClient.on("error", error => console.error("Discord client error: ", error));

        this.discordClient.on("exit", () => {
            this.beastiary.exit().then(() => {
                console.log("Exit successful.");

                if (this.discordClient.shard) {
                    this.discordClient.shard.send("exit");
                }

                this.discordClient.destroy();

                process.exit();
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error performing Beastiary exit cleanup.

                    ${error}
                `);
            });
        });
    }
}