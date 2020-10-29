import { Document } from "mongoose";
import { GuildModel, PlayerGuild } from "../models/Guild";
import GameObjectCache from "../structures/GameObjectCache";

// The manager instance for guild game objects
export default class PlayerGuildManager extends GameObjectCache<PlayerGuild> {
    protected readonly model = GuildModel;

    protected readonly cacheTimeout = 300000;

    protected documentToGameObject(document: Document): PlayerGuild {
        return new PlayerGuild(document);
    }

    // Gets a guild object by a given id
    public async fetchByGuildId(guildId: string): Promise<PlayerGuild> {
        // First check the cache to see if the guild's object already exists in it
        for (const cachedGuild of this.cache.values()) {
            // If the current guild's information matches
            if (cachedGuild.gameObject.guildId === guildId) {
                // Reset the cached guild's deletion timer
                cachedGuild.resetTimer();

                // Return the existing guild from the cache
                return cachedGuild.gameObject;
            }
        }
        // No matching guild exists in the cache

        // Attempt to find a guild document with the given information
        let guildDocument: Document | null;
        try {
            guildDocument = await GuildModel.findOne({ [PlayerGuild.fieldNames.guildId]: guildId });
        }
        catch (error) {
            throw new Error(`There was an error finding an existing guild document: ${error}`);
        }

        // If no document currently represents the guild
        if (!guildDocument) {
            // Create a new document for the guild
            guildDocument = PlayerGuild.newDocument(guildId);

            // Save the new guild
            try {
                await guildDocument.save();
            }
            catch (error) {
                throw new Error(`There was an error saving a new guild document to the database: ${error}`);
            }
        }

        // Create a guild object from the guild document
        const playerGuild = this.documentToGameObject(guildDocument);

        // Add the guild to the cache
        try {
            await this.addToCache(playerGuild);
        }
        catch (error) {
            throw new Error(`There was an error adding a guild to the cache: ${error}`);
        }

        // Return the pre-existing or newly created guild object
        return playerGuild;
    }
}