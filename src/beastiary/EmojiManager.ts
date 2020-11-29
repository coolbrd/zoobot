import { stripIndent } from 'common-tags';
import { Guild } from 'discord.js';
import BeastiaryClient from '../bot/BeastiaryClient';
import { EMOJI_SERVER_ID } from '../config/secrets';

interface EmojiCollection {
    [emojiName: string]: string
}

export default class EmojiManager {
    private readonly beastiaryClient: BeastiaryClient;

    private emojis: EmojiCollection = {};

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
    }

    public async init(): Promise<void> {
        let emojiGuild: Guild;
        try {
            emojiGuild = await this.beastiaryClient.discordClient.guilds.fetch(EMOJI_SERVER_ID);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching the admin guild.

                ${error}
            `);
        }

        if (emojiGuild) {
            for (const emoji of emojiGuild.emojis.cache.values()) {
                Object.defineProperty(this.emojis, emoji.name, {
                    value: emoji.toString(),
                    writable: false,
                    enumerable: true
                });
            }

            if (!this.beastiaryClient.discordClient.shard) {
                throw new Error(stripIndent`
                    A BeastiaryClient's Discord client has an undefined shard.
                `);
            }

            this.beastiaryClient.discordClient.shard.broadcastEval(`
                this.emit("emojisfound", ${JSON.stringify(this.emojis)});
            `);
        }
        else {
            this.beastiaryClient.discordClient.once("emojisfound", emojis => {
                this.emojis = emojis;
            });

            return;
        }
    }

    public getByName(name: string): string {
        if (!(name in this.emojis)) {
            throw new Error(stripIndent`
                Invalid emoji name.

                Name: ${name}
            `);
        }

        return this.emojis[name];
    }

    public getReactionVersionByName(name: string): string {
        const emojiString = this.getByName(name);

        return emojiString.slice(1, -1);
    }
}