import { stripIndent } from 'common-tags';
import { Guild } from 'discord.js';
import { inspect } from "util";
import BeastiaryClient from '../bot/BeastiaryClient';
import { EMOJI_SERVER_ID } from '../config/secrets';

interface EmojiCollection {
    [emojiName: string]: string
}

class Emojis {
    private emojis: EmojiCollection = {};

    public get pep(): string {
        return this.getByName("pep");
    }

    public get essence(): string {
        return this.getByName("essence");
    }

    public get token(): string {
        return this.getByName("token");
    }

    public get xp(): string {
        return this.getByName("xp");
    }

    public get medalBronze(): string {
        return this.getByName("medalbronze");
    }

    public get medalSilver(): string {
        return this.getByName("medalsilver");
    }

    public get medalGold(): string {
        return this.getByName("medalgold");
    }

    public getRarity(rarity: number): string {
        return this.getByName(`t${rarity}`);
    }

    public async init(beastiaryClient: BeastiaryClient): Promise<void> {
        let emojiGuild: Guild;
        try {
            emojiGuild = await beastiaryClient.discordClient.guilds.fetch(EMOJI_SERVER_ID);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching the admin guild.

                ${error}
            `);
        }

        if (emojiGuild.available) {
            for (const emoji of emojiGuild.emojis.cache.values()) {
                Object.defineProperty(this.emojis, emoji.name ? emoji.name : "null", {
                    value: emoji.toString(),
                    writable: false,
                    enumerable: true
                });
            }

            if (!beastiaryClient.discordClient.shard) {
                throw new Error(stripIndent`
                    A BeastiaryClient's Discord client has an undefined shard.
                `);
            }

            beastiaryClient.discordClient.shard.broadcastEval(async client => client.emit("emojisfound", inspect(client.emojis)));
        }
        else {
            beastiaryClient.discordClient.once("emojisfound", emojis => {
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

    public getAnimalLevelEmoji(level: number): string {
        const emojiLevel = Math.max(0, Math.min(15, level));

        const emojiName = "l" + emojiLevel;

        return this.getByName(emojiName);
    }
}
export default new Emojis();