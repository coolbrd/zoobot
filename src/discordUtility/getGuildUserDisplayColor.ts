import { UserResolvable, GuildResolvable, Channel, Guild } from 'discord.js';

import { client } from '..';

// Gets a user's display color in a given guild
export default function getGuildUserDisplayColor(userResolvable: UserResolvable | null, guildResolvable: GuildResolvable | Channel | null): number {
    // The default color that will be given back if a guild member color can't be found
    // It's a single shade of gray below pure white because Discord interprets 0xFFFFFF as black for some reason
    const defaultColor = 0xFEFEFE;

    // If either resolvable is missing
    // These are allowed to be null so things like client.user don't have to make sure that the value isn't null (it's annoying)
    if (!userResolvable || !guildResolvable) {
        return defaultColor;
    }

    let guild: Guild;
    // If the thing to resolve into a guild is a channel
    if (guildResolvable instanceof Channel) {
        // Get the channel's guild property if it has one
        // The only case in which it wouldn't is with DM channels
        if (!('guild' in guildResolvable)) {
            return defaultColor;
        }
        guild = guildResolvable.guild;
    }

    // If the thing to resolve into a guild is anything else (handled by a build-in method)
    else {
        const resolvedGuild = client.guilds.resolve(guildResolvable);
        // If no guild could be found based on the given info
        if (!resolvedGuild) {
            return defaultColor;
        }

        guild = resolvedGuild;
    }

    // Get the given user's member instance in the found guild
    const guildMember = guild.member(userResolvable);
    if (!guildMember) {
        return defaultColor;
    }

    // Return the member's color
    // This returns the default color if black is found to be the user's display color
    // For some reason, having the default display color (white) comes back as 0 (black)
    // This will cause users displayed as actual black to return white, but I think that's more appropriate
    return guildMember.displayColor || defaultColor;
}
