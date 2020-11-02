import { UserResolvable, GuildResolvable, Channel, Guild } from "discord.js";
import { client } from "..";

// Gets a user's display color in a given guild
export default function getGuildUserDisplayColor(userResolvable: UserResolvable | null, guildResolvable: GuildResolvable | Channel | null): number {
    // The default color that will be given back if a guild member color can't be found
    // It's a single shade of gray below pure white because Discord interprets 0xFFFFFF as black for some reason
    const defaultColor = 0xFEFEFE;

    if (!userResolvable || !guildResolvable) {
        return defaultColor;
    }

    let guild: Guild;
    if (guildResolvable instanceof Channel) {
        if (!("guild" in guildResolvable)) {
            return defaultColor;
        }
        guild = guildResolvable.guild;
    }
    else {
        const resolvedGuild = client.guilds.resolve(guildResolvable);

        if (!resolvedGuild) {
            return defaultColor;
        }

        guild = resolvedGuild;
    }

    const guildMember = guild.member(userResolvable);
    if (!guildMember) {
        return defaultColor;
    }

    return guildMember.displayColor || defaultColor;
}
