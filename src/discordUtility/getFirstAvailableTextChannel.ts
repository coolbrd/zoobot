import { stripIndent } from "common-tags";
import { Channel, Guild, TextChannel } from "discord.js";

export default async function getFirstAvailableTextChannel(guild: Guild): Promise<TextChannel | undefined> {
    for (const guildChannel of guild.channels.cache.values()) {
        if (guildChannel.type === "text") {
            let channel: Channel;
            try {
                channel = await guildChannel.fetch();
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a channel from a guild channel.

                    Guild channel: ${JSON.stringify(guildChannel)}
                    
                    ${error}
                `);
            }

            if (!(channel instanceof TextChannel)) {
                throw new Error(stripIndent`
                    Somehow a non-text channel was fetched from a text guild channel.

                    Channel: ${JSON.stringify(channel)}
                `);
            }

            return channel;
        }
    }
    return undefined;
}