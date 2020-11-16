import { stripIndent } from "common-tags";
import { UserResolvable, GuildResolvable, GuildMember } from "discord.js";
import { client } from "..";

export default function getGuildMember(userResolvable: UserResolvable, guildResolvable: GuildResolvable): GuildMember {
    const user = client.users.resolve(userResolvable);
    if (!user) {
        throw new Error(stripIndent`
            getGuildMember was given a UserResolvable that couldn't be resolved.

            User resolvable: ${JSON.stringify(userResolvable)}
        `);
    }

    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error(stripIndent`
            getGuildMember was given a GuildResolvable that couldn't be resolved.

            Guild resolvable: ${JSON.stringify(guildResolvable)}
        `);
    }

    const member = guild.member(user);
    if (!member) {
        throw new Error(stripIndent`
            getGuildMember couldn't resolve a guild and a user into a GuildMember.

            Guild: ${JSON.stringify(guild)}
            User: ${JSON.stringify(user)}
        `);
    }

    return member;
}
