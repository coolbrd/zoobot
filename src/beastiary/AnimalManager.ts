import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";
import getGuildMember from "../discordUtility/getGuildMember";
import { AnimalModel, Animal } from "../models/Animal";
import { Player } from "../models/Player";
import { Species, SpeciesCard } from "../models/Species";
import GameObjectCache from "../structures/GameObjectCache";
import { beastiary } from "./Beastiary";

export default class AnimalManager extends GameObjectCache<Animal> {
    protected readonly model = AnimalModel;

    protected readonly cacheObjectTimeout = 300000;

    protected documentToGameObject(document: Document): Animal {
        return new Animal(document);
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
            throw new Error("There was an error finding an animal by its nickname.");
        }

        if (!animalDocument) {
            return;
        }

        const animal = this.documentToGameObject(animalDocument);

        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(`There was an error adding a searched animal to the cache: ${error}`);
        }

        return animal;
    }

    public async createAnimal(ownerGuildMember: GuildMember, species: Species, card: SpeciesCard): Promise<void> {
        let owner: Player;
        try {
            owner = await beastiary.players.fetch(ownerGuildMember);
        }
        catch (error) {
            throw new Error(`There was an error fetching a player object by a guild member while creating an animal: ${error}`);
        }

        const animalDocument = Animal.newDocument(ownerGuildMember, species, card);

        try {
            await animalDocument.save();
        }
        catch (error) {
            throw new Error(`There was an error saving a new animal: ${error}`);
        }

        const animal = this.documentToGameObject(animalDocument);

        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(`There was an error adding a new animal to the animal cache: ${error}`);
        }

        owner.addAnimalIdToCollection(animal.id);
    }

    public async releaseAnimal(animalId: Types.ObjectId): Promise<void> {
        let animal: Animal;
        try {
            animal = await this.fetchById(animalId);
        }
        catch (error) {
            throw new Error(`There was an error fetching an animal by its id in the animal mananger: ${error}`);
        }

        let owner: Player;
        try {
            owner = await beastiary.players.fetch(getGuildMember(animal.ownerId, animal.guildId));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player from the player manager: ${error}`);
        }

        owner.removeAnimalIdFromCollection(animal.id);
        owner.removeAnimalIdFromCrew(animal.id);

        owner.scraps += animal.value;

        try {
            await this.removeFromCache(animal.id);
        }
        catch (error) {
            throw new Error(`There was an error removing a deleted animal from the cache: ${error}`);
        }

        try {
            await animal.delete();
        }
        catch (error) {
            throw new Error(`There was an error deleting an animal object: ${error}`);
        }
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
        let playerObject = searchOptions && searchOptions.playerObject;
        const searchList = searchOptions && searchOptions.searchList;

        if (!searchList) {
            try {
                return await beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(`There was an error finding an animal by a given nickname: ${error}`);
            }
        }

        const searchNumber = Number(searchTerm);

        if (isNaN(searchNumber)) {
            let animalObject: Animal | undefined;
            try {
                animalObject = await beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(`There was an error finding an animal by its nickname: ${error}`);
            }

            if (animalObject) {
                return animalObject;
            }
        }
        else {
            if (!playerObject) {
                // Make sure there's enough info provided to determine the player object
                if (!guildId || !userId) {
                    throw new Error("Insufficient information was provided to searchAnimal for the purpose of searching by animal position.");
                }

                try {
                    playerObject = await beastiary.players.fetch(getGuildMember(userId, guildId));
                }
                catch (error) {
                    throw new Error(`There was an error fetching a player object by a guild member while searching an animal: ${error}`);
                }
            }

            let animalId: Types.ObjectId | undefined;
            switch (searchList) {
                case "collection": {
                    animalId = playerObject.getCollectionIdPositional(searchNumber - 1);
                    break;
                }
                case "crew": {
                    animalId = playerObject.getCrewIdPositional(searchNumber - 1);
                    break;
                }
            }

            if (animalId) {
                let animalObject: Animal;
                try {
                    animalObject = await this.fetchById(animalId);
                }
                catch (error) {
                    throw new Error(`There was an error fetching a searched animal from the cache: ${error}`);
                }
                
                return animalObject;
            }
        }

        // If the search term is a number, but none of the other search options have returned anything so far
        if (!isNaN(searchNumber)) {
            // Search the number as a nickname (last resort)
            try {
                return await beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(`There was an error finding an animal by its nickname: ${error}`);
            }
        }

        return;
    }
}