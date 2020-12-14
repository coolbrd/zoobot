import { Document, Types } from "mongoose";
import gameConfig from "../config/gameConfig";
import getGuildMember from "../discordUtility/getGuildMember";
import { AnimalModel } from "../models/Animal";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import GameObjectCache from "../structures/GameObject/GameObjectCache";
import { stripIndent } from "common-tags";
import { GuildMember } from 'discord.js';

export default class AnimalManager extends GameObjectCache<Animal> {
    protected readonly model = AnimalModel;

    protected readonly cacheObjectTimeout = gameConfig.animalCacheTimeout;

    protected documentToGameObject(document: Document): Animal {
        return new Animal(document, this.beastiaryClient);
    }

    public async fetchByNickName(nickname: string, guildId?: string): Promise<Animal | undefined> {
        const cachedMatchingAnimal = this.getMatchingFromCache(animal => {
            let matchingGuild = true;
            if (guildId) {
                matchingGuild = animal.guildId === guildId;
            }

            let matchingNickname = false;
            if (animal.nickname) {
                matchingNickname = animal.nickname.toLowerCase() === nickname.toLowerCase();
            }
            
            return matchingGuild && matchingNickname;
        });

        if (cachedMatchingAnimal) {
            return cachedMatchingAnimal;
        }

        const searchQuery = {
            $text: {
                $search: nickname
            }
        };

        if (guildId) {
            Object.defineProperty(searchQuery, Animal.fieldNames.guildId, {
                value: guildId,
                writable: false,
                enumerable: true
            });
        }

        let animalDocument: Document | null;
        try {
            animalDocument = await AnimalModel.findOne(searchQuery);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error finding an animal by its nickname.

                Searched nickname: ${nickname}
                Searched guild id: ${guildId}
                Search query: ${JSON.stringify(searchQuery)}

                ${error}
            `);
        }

        if (!animalDocument) {
            return;
        }

        const animal = this.documentToGameObject(animalDocument);

        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a searched animal to the cache.

                Animal document: ${animalDocument.toString()}
                Animal: ${animal.debugString}
                
                ${error}
            `);
        }
        return animal;
    }

    public async createAnimal(owner: Player, species: Species, card: SpeciesCard): Promise<Animal> {
        const animalDocument = Animal.newDocument(owner, species, card);

        try {
            await animalDocument.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a new animal.
                
                Animal document: ${animalDocument.toString()}

                ${error}
            `);
        }

        const animal = this.documentToGameObject(animalDocument);

        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a new animal to the animal cache.

                Animal: ${animal.debugString}
                
                ${error}
            `);
        }

        return animal;
    }

    public async searchAnimal(
        searchTerm: string,
        searchOptions?: {
            guildId?: string,
            userId?: string,
            playerObject?: Player,
            searchList?: "collection" | "crew"
        }): Promise<Animal | undefined>
    {
        const guildId = searchOptions && searchOptions.guildId;
        const userId = searchOptions && searchOptions.userId;
        let player = searchOptions && searchOptions.playerObject;
        const searchList = searchOptions && searchOptions.searchList;

        if (!searchList) {
            try {
                return await this.beastiaryClient.beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error finding an animal by a given nickname in the search method.

                    Search term: ${searchTerm}
                    Search options: ${JSON.stringify(searchOptions)}
                    
                    ${error}
                `);
            }
        }

        if (!player) {
            // Make sure there's enough info provided to determine the player object
            if (!guildId || !userId) {
                throw new Error(stripIndent`
                    Insufficient information was provided to searchAnimal for the purpose of searching by animal position.

                    Search options: ${JSON.stringify(searchOptions)}
                `);
            }

            let playerGuildMember: GuildMember | undefined;
            try {
                playerGuildMember = await getGuildMember(userId, guildId, this.beastiaryClient);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error getting a guild member by a player's information.

                    User id: ${userId}
                    Guild id: ${guildId}

                    ${error}
                `);
            }

            if (!playerGuildMember) {
                throw new Error(stripIndent`
                    No guild member was found for a player's information in the animal search command.

                    User id: ${userId}
                    Guild id: ${guildId}
                `);
            }

            player = await this.beastiaryClient.beastiary.players.safeFetch(playerGuildMember);
        }

        let searchNumber: number;

        if (searchTerm === "last") {
            searchNumber = player.collectionAnimalIds.list.length;
        }
        else {
            searchNumber = Number(searchTerm);
        }

        if (isNaN(searchNumber)) {
            let animalObject: Animal | undefined;
            try {
                animalObject = await this.beastiaryClient.beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error finding an animal by its nickname.

                    Search term: ${searchTerm}
                    Search options: ${JSON.stringify(searchOptions)}
                    
                    ${error}
                `);
            }

            if (animalObject) {
                return animalObject;
            }
        }
        else {
            let animalId: Types.ObjectId | undefined;
            switch (searchList) {
                case "collection": {
                    animalId = player.collectionAnimalIds.getPosition(searchNumber - 1);
                    break;
                }
                case "crew": {
                    animalId = player.crewAnimalIds.getPosition(searchNumber - 1);
                    break;
                }
            }

            if (animalId) {
                let animalObject: Animal | undefined;
                try {
                    animalObject = await player.fetchAnimalById(animalId);
                }
                catch (error) {
                    throw new Error(stripIndent`
                        There was an error fetching a searched animal from a player's collection.

                        Search options: ${searchOptions}
                        Player: ${player.debugString}
                        
                        ${error}
                    `);
                }
                
                return animalObject;
            }
        }

        // If the search term is a number, but none of the other search options have returned anything so far
        if (!isNaN(searchNumber)) {
            // Search the number as a nickname (last resort)
            try {
                return await this.beastiaryClient.beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error finding an animal by its nickname.

                    Search term: ${searchTerm}
                    Search options: ${JSON.stringify(searchOptions)}
                    
                    ${error}
                `);
            }
        }

        return;
    }
}