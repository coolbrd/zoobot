import { Channel, Guild, TextChannel } from "discord.js";

export default async function getFirstAvailableTextChannel(guild: Guild): Promise<TextChannel | undefined> {
    for (const guildChannel of guild.channels.cache.values()) {
        if (guildChannel.type === "text") {
            let channel: Channel;
            try {
                channel = await guildChannel.fetch();
            }
            catch (error) {
                throw new Error(`There was an error fetching a channel from a guild channel: ${error}`);
            }

            if (!(channel instanceof TextChannel)) {
                throw new Error("Somehow a non-text channel was fetched from a text guild channel.");
            }

            return channel;
        }
    }
    return undefined;
}