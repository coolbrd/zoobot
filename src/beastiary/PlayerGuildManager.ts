import { Guild } from "discord.js";
import { Document } from "mongoose";
import { client } from "..";
import gameConfig from "../config/gameConfig";
import { GuildModel } from "../models/PlayerGuild";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import GameObjectCache from "../structures/GameObject/GameObjectCache";

export default class PlayerGuildManager extends GameObjectCache<PlayerGuild> {
    protected readonly model = GuildModel;

    protected readonly cacheObjectTimeout = gameConfig.playerGuildCacheTimeout;

    protected documentToGameObject(document: Document): PlayerGuild {
        return new PlayerGuild(document);
    }

    public async fetchByGuildId(guildId: string): Promise<PlayerGuild> {
        const cachedMatchingGuild = this.getMatchingFromCache(guild => {
            return guild.guildId === guildId;
        });

        if (cachedMatchingGuild) {
            return cachedMatchingGuild;
        }

        let guildDocument: Document | null;
        try {
            guildDocument = await GuildModel.findOne({ [PlayerGuild.fieldNames.guildId]: guildId });
        }
        catch (error) {
            throw new Error(`There was an error finding an existing guild document: ${error}`);
        }

        if (!guildDocument) {
            let guild: Guild;
            try {
                guild = await client.guilds.fetch(guildId);
            }
            catch (error) {
                throw new Error(`There was an error fetching a guild by its id when creating a new guild document: ${error}`);
            }

            guildDocument = PlayerGuild.newDocument(guild);

            try {
                await guildDocument.save();
            }
            catch (error) {
                throw new Error(`There was an error saving a new guild document to the database: ${error}`);
            }
        }

        const playerGuild = this.documentToGameObject(guildDocument);

        try {
            await this.addToCache(playerGuild);
        }
        catch (error) {
            throw new Error(`There was an error adding a guild to the cache: ${error}`);
        }

        return playerGuild;
    }
}