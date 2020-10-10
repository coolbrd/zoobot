import { Document } from "mongoose";

import config from "../config/BotConfig";
import { GuildModel, PlayerGuild } from "../models/Guild";
import WrapperCache from "../structures/GameObjectCache";

export default class PlayerGuildManager extends WrapperCache<PlayerGuild> {
    constructor() {
        super(120000);
    }

    // Gets a guild object by a given id
    public async fetch(guildId: string): Promise<PlayerGuild> {
        // First check the cache to see if the guild's object already exists in it
        for (const cachedGuild of this.cache.values()) {
            // If the current guild's information matches
            if (cachedGuild.value.getGuildId() === guildId) {
                // Reset the cached guild's deletion timer
                cachedGuild.setTimer(this.createNewTimer(cachedGuild.value));

                // Return the existing guild from the cache
                return cachedGuild.value;
            }
        }
        // No matching guild exists in the cache

        // Attempt to find a guild document with the given information
        let guildDocument: Document | null;
        try {
            guildDocument = await GuildModel.findOne({ id: guildId });
        }
        catch (error) {
            throw new Error(`There was an error finding an existing guild document: ${error}`);
        }

        // If no document currently represents the guild
        if (!guildDocument) {
            // Make one and save it
            guildDocument = new GuildModel({
                id: guildId,
                config: {
                    prefix: config.prefix
                }
            });

            try {
                await guildDocument.save();
            }
            catch (error) {
                throw new Error(`There was an error saving a new guild document to the database: ${error}`);
            }
        }

        const playerGuild = new PlayerGuild(guildDocument._id);

        try {
            await this.addToCache(playerGuild);
        }
        catch (error) {
            throw new Error(`There was an error adding a guild to the cache: ${error}`);
        }

        // Return the pre-existing or newly created guild document within a wrapper object
        return playerGuild;
    }
}