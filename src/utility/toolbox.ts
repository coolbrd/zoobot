import { UserResolvable, GuildResolvable } from 'discord.js';
import { client } from '..';

// Does pretty much what you'd expect it to
export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Gets a user's display color in a given guild
export function getGuildUserDisplayColor(userResolvable: UserResolvable, guildResolvable: GuildResolvable) {
    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error("Attempted to get the display color of a user from a guild that could not be resolved.");
    }

    const guildMember = guild.member(userResolvable)
    if (!guildMember) {
        throw new Error("Attempted to get the display color of a user that could not be resolved.");
    }

    return guildMember.displayColor;
}