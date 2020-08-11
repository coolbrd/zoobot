import { User, Guild } from 'discord.js';

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getGuildUserDisplayColor(user: User, guild: Guild) {
    const guildMember = guild.member(user);
    if (!guildMember) {
        return undefined;
    }

    return guildMember.displayColor;
}