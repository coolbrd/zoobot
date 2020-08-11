import { UserResolvable, GuildResolvable, ChannelResolvable, TextChannel } from 'discord.js';
import { client } from '..';

// Does pretty much what you'd expect it to
export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Gets a user's display color in a given guild
export function getGuildUserDisplayColor(userResolvable: UserResolvable, guildResolvable: GuildResolvable) {
    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error(`Attempted to get the display color of a user from a guild that could not be resolved.`);
    }

    const guildMember = guild.member(userResolvable)
    if (!guildMember) {
        throw new Error(`Attempted to get the display color of a user that could not be resolved.`);
    }

    return guildMember.displayColor;
}

// Sends a message in a channel, but has generic error handling so it doesn't have to be repeated 1,000,000 times throughout code.
export async function betterSend(channel: TextChannel, content: string) {
    try {
        return await channel.send(content);
    }
    catch (error) {
        console.error(`Error trying to send message in channel ${channel.id}.`, error);
        return;
    }
}