import { Guild } from "discord.js";
import { Document } from "mongoose";
import gameConfig from "../config/gameConfig";
import { GuildModel } from "../models/PlayerGuild";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import GameObjectCache from "../structures/GameObject/GameObjectCache";
import { stripIndent } from "common-tags";
import { PremiumIdModel } from "../models/PremiumId";

export default class PlayerGuildManager extends GameObjectCache<PlayerGuild> {
    protected readonly model = GuildModel;

    protected readonly cacheObjectTimeout = gameConfig.playerGuildCacheTimeout;

    protected documentToGameObject(document: Document): PlayerGuild {
        return new PlayerGuild(document, this.beastiaryClient);
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
            throw new Error(stripIndent`
                There was an error finding an existing guild document.

                Guild id: ${guildId}
                
                ${error}
            `);
        }

        if (!guildDocument) {
            let guild: Guild;
            try {
                guild = await this.beastiaryClient.discordClient.guilds.fetch(guildId);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a guild by its id when creating a new guild document.

                    Guild id: ${guildId}
                    
                    ${error}
                `);
            }

            guildDocument = PlayerGuild.newDocument(guild);

            try {
                await guildDocument.save();
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error saving a new guild document to the database.

                    New guild document: ${guildDocument.toString()}
                    
                    ${error}
                `);
            }
        }

        const playerGuild = this.documentToGameObject(guildDocument);

        try {
            await this.addToCache(playerGuild);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a guild to the cache.

                Player guild: ${playerGuild.debugString}
                
                ${error}
            `);
        }

        return playerGuild;
    }

    public async givePremium(id: string): Promise<void> {
        let alreadyHasPremium: boolean;
        try {
            alreadyHasPremium = await this.hasPremium(id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error checking if an id already has premium.

                ${error}
            `);
        }

        if (alreadyHasPremium) {
            return;
        }

        const newPremiumIdDocument = new PremiumIdModel({ id: id });

        try {
            await newPremiumIdDocument.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a new premium id document.

                Document: ${newPremiumIdDocument}

                ${error}
            `);
        }
    }

    public async removePremium(id: string): Promise<void> {
        try {
            await PremiumIdModel.deleteOne({ id: id });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error deleting a premium id.

                Id: ${id}

                ${error}
            `);
        }
    }

    public async hasPremium(id: string): Promise<boolean> {
        let isPremium: boolean;
        try {
            isPremium = await PremiumIdModel.exists({ id: id });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error finding a premium id document by an id.

                Id: ${id}

                ${error}
            `);
        }

        return isPremium;
    }
}