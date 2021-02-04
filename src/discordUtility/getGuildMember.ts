import { stripIndent } from "common-tags";
import { GuildMember, User, Guild } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";

export default async function getGuildMember(userId: string, guildId: string, beastiaryClient: BeastiaryClient): Promise<GuildMember | undefined> {
    let user: User | undefined;
    try {
        user = await beastiaryClient.discordClient.users.fetch(userId);
    }
    catch (error) {
        console.error(stripIndent`
            There was an error fetching a user in getGuildMember.

            ${error}
        `);
        return undefined;
    }

    let guild: Guild;
    try {
        guild = await beastiaryClient.discordClient.guilds.fetch(guildId);
    }
    catch (error) {
        console.error(stripIndent`
            There was an error fetching a guild in getGuildMember.

            ${error}
        `);
        return undefined;
    }

    let member: GuildMember | undefined;
    try {
        member = await guild.members.fetch(user);
    }
    catch (error) {
        console.error(stripIndent`
            There was an error fetching a guild member in getGuildMember.

            ${error}
        `);
        return undefined;
    }

    return member;
}
