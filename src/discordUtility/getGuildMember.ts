import { UserResolvable, GuildResolvable, GuildMember } from "discord.js";

import { client } from "..";

// Gets a GuildMember instance from a given guild and user
export default function getGuildMember(userResolvable: UserResolvable, guildResolvable: GuildResolvable): GuildMember {
    const user = client.users.resolve(userResolvable);
    if (!user) {
        throw new Error("getGuildMember was given a UserResolvable that couldn't be resolved.");
    }

    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error("getGuildMember was given a GuildResolvable that couldn't be resolved.");
    }

    const member = guild.member(user);
    if (!member) {
        throw new Error("getGuildMember couldn't resolve a guild and a user into a GuildMember.");
    }

    return member;
}
