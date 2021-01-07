import { Client, Guild, User } from "discord.js";

export async function isUserId(id: string, client: Client): Promise<boolean> {
    let user: User;

    try {
        user = await client.users.fetch(id);
    }
    catch (error) {
        return false;
    }

    return Boolean(user);
}

export async function isGuildId(id: string, client: Client): Promise<boolean> {
    let guild: Guild;

    try {
        guild = await client.guilds.fetch(id);
    }
    catch (error) {
        return false;
    }

    return Boolean(guild);
}

export async function getIdType(id: string, client: Client): Promise<"user" | "guild" | "unknown"> {
    const isUser = await isUserId(id, client);

    if (isUser) {
        return "user";
    }

    const isGuild = await isGuildId(id, client);
    
    if (isGuild) {
        return "guild";
    }

    return "unknown";
}