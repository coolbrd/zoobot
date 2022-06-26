import { stripIndent } from "common-tags";
import { Channel, Guild, TextChannel } from "discord.js";
import { inspect } from "util";

export default async function getFirstAvailableTextChannel(guild: Guild): Promise<TextChannel | undefined> {
    for (const guildChannel of guild.channels.cache.values()) {
        if (guildChannel.type === "GUILD_TEXT") {
            let channel: Channel;
            try {
                channel = await guildChannel.fetch();
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a channel from a guild channel.

                    Guild channel: ${inspect(guildChannel)}
                    
                    ${error}
                `);
            }

            if (!(channel instanceof TextChannel)) {
                throw new Error(stripIndent`
                    Somehow a non-text channel was fetched from a text guild channel.

                    Channel: ${inspect(channel)}
                `);
            }

            return channel;
        }
    }
    return undefined;
}