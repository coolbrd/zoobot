import { Guild } from "discord.js";
import { Document } from "mongoose";

import { GuildModel, PlayerGuild } from "../models/Guild";

// Gets a guild document from the database that corresponds to a given guild object and returns it as an object
export async function getGuildObject(guild: Guild): Promise<PlayerGuild> {
    // Attempt to find an existing document that represents this guild
    let guildDocument: Document | null;
    try {
        guildDocument = await GuildModel.findOne({ id: guild.id });
    }
    catch (error) {
        throw new Error(error);
    }

    // If no document currently represents the guild
    if (!guildDocument) {
        // Make one and save it
        guildDocument = new GuildModel({
            id: guild.id,
            config: {
                prefix: '>'
            }
        });

        try {
            await guildDocument.save();
        }
        catch (error) {
            throw new Error('There was an error saving a new guild document to the database.');
        }
    }

    // Return the pre-existing or newly created guild document within a wrapper object
    return new PlayerGuild(guildDocument._id);
}