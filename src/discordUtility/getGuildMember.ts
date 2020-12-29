import { GuildMember, User, Guild } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";

export default async function getGuildMember(userId: string, guildId: string, beastiaryClient: BeastiaryClient): Promise<GuildMember | undefined> {
    let user: User | undefined;
    try {
        user = await beastiaryClient.discordClient.users.fetch(userId);
    }
    catch (error) {
        return undefined;
    }

    let guild: Guild | undefined;
    try {
        guild = await beastiaryClient.discordClient.guilds.fetch(guildId);
    }
    catch (error) {
        return undefined;
    }

    if (!guild) {
        return;
    }

    let member: GuildMember | undefined;
    try {
        member = await guild.members.fetch(user);
    }
    catch (error) {
        return undefined;
    }

    return member;
}
