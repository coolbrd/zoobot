import { stripIndent } from "common-tags";
import { GuildMember, User, Guild } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";

export default async function getGuildMember(userId: string, guildId: string, beastiaryClient: BeastiaryClient): Promise<GuildMember | undefined> {
    let user: User | undefined;
    try {
        user = await beastiaryClient.discordClient.users.fetch(userId);
    }
    catch (error) {
        throw new Error(stripIndent`
            There was an error fetching a user from the user cache.

            User id: ${userId}

            ${error}
        `);
    }

    let guild: Guild | undefined;
    try {
        guild = await beastiaryClient.discordClient.guilds.fetch(guildId);
    }
    catch (error) {
        throw new Error(stripIndent`
            There was an error fetching a guild from the guild cache.

            Guild id: ${guildId}

            ${error}
        `);
    }

    if (!guild) {
        return;
    }

    let member: GuildMember | undefined;
    try {
        member = await guild.members.fetch(user);
    }
    catch (error) {
        throw new Error(stripIndent`
            There was an error fetching a guild member from a guild's member cache.

            User id: ${userId}
            Guild id: ${guildId}

            ${error}
        `);
    }

    return member;
}
