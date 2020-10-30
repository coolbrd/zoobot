import { Document } from "mongoose";
import { GuildModel, PlayerGuild } from "../models/Guild";
import GameObjectCache from "../structures/GameObjectCache";

export default class PlayerGuildManager extends GameObjectCache<PlayerGuild> {
    protected readonly model = GuildModel;

    protected readonly cacheObjectTimeout = 300000;

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
            guildDocument = PlayerGuild.newDocument(guildId);

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