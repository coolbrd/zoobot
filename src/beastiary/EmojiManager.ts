import { stripIndent } from 'common-tags';
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
        const emojiGuild = this.beastiaryClient.discordClient.guilds.resolve(EMOJI_SERVER_ID);

        if (emojiGuild) {
            const emojiNames = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12", "t13", "t14", "tu", "capture"];

            for (const emojiName of emojiNames) {
                const emoji = emojiGuild.emojis.cache.find(emoji => emoji.name === emojiName);

                if (!emoji) {
                    throw new Error(stripIndent`
                        A rarity emoji couldn't be found.

                        Emoji name: ${emojiName}
                    `);
                }

                Object.defineProperty(this.emojis, emojiName, {
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