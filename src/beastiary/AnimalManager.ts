import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";
import getGuildMember from "../discordUtility/getGuildMember";
import { AnimalModel, Animal } from "../models/Animal";
import { Player } from "../models/Player";
import { Species, SpeciesCard } from "../models/Species";
import GameObjectCache from "../structures/GameObjectCache";
import { beastiary } from "./Beastiary";

// The central animal manager instance
// Responsible for creating, searching, retrieving, caching, and deleting animals
// All operations on animal objects should be performed through this manager
export default class AnimalManager extends GameObjectCache<Animal> {
    protected readonly model = AnimalModel;

    protected readonly cacheTimeout = 300000;

    protected documentToGameObject(document: Document): Animal {
        return new Animal(document);
    }

    // Fetch an animal object by its nickname and optional guild
    public async fetchByNickName(nickname: string, guildId?: string): Promise<Animal | undefined> {
        // First search the cache for the appropriate animal
        for (const cachedAnimal of this.cache.values()) {
            // Check for animals with the same nickname first
            if (cachedAnimal.gameObject.nickname === nickname) {
                // If a seached guild was provided, and this animal isn't in that guild
                if (guildId && cachedAnimal.gameObject.guildId !== guildId) {
                    // Check the next cached animal
                    continue;
                }
                // Either no guild was specified or this animal is from the specified guild

                // Reset the animal's cache timer, preventing it from being removed for a little longer
                cachedAnimal.resetTimer();

                // Return the already cached animal
                return cachedAnimal.gameObject;
            }
        }
        // If the animal wasn't found in the cache

        // The base search query to add options to as needed
        const searchQuery = {
            $text: {
                $search: nickname
            }
        };

        // If a guild id was provided to narrow down the search
        if (guildId) {
            // Add the appropriate property to the search query options
            Object.defineProperty(searchQuery, Animal.fieldNames.guildId, {
                value: guildId,
                writable: false,
                enumerable: true
            });
        }

        // Attempt to find the animal by the given search options
        let animalDocument: Document | null;
        try {
            animalDocument = await AnimalModel.findOne(searchQuery);
        }
        catch (error) {
            throw new Error("There was an error finding an animal by its nickname.");
        }

        // If no animal was found by the given information
        if (!animalDocument) {
            return;
        }

        // If an animal was found, convert it into an object
        const animal = this.documentToGameObject(animalDocument);

        // Add the animal to the cache
        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(`There was an error adding a searched animal to the cache: ${error}`);
        }

        return animal;
    }

    // Create a new animal and assign it to a given guild member's player object
    public async createAnimal(ownerMember: GuildMember, species: Species, card: SpeciesCard): Promise<void> {
        // Get the player object of the guild member
        let owner: Player;
        try {
            owner = await beastiary.players.fetch(ownerMember);
        }
        catch (error) {
            throw new Error(`There was an error fetching a player object by a guild member while creating an animal: ${error}`);
        }

        // Create a new animal document
        const animalDocument = Animal.newDocument(ownerMember, species, card);

        // Save the new animal
        try {
            await animalDocument.save();
        }
        catch (error) {
            throw new Error(`There was an error saving a new animal: ${error}`);
        }

        // Turn the animal into a game object and add it to the cache
        const animal = this.documentToGameObject(animalDocument);

        // Add the new animal to the cache
        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(`There was an error adding a new animal to the animal cache: ${error}`);
        }

        // Add the animal to the player's collection
        owner.addAnimalIdToCollection(animal.id);
    }

    // Deletes an animal by a given id
    public async deleteAnimal(animalId: Types.ObjectId): Promise<void> {
        // Get the specified animal
        let animal: Animal;
        try {
            animal = await this.fetchById(animalId);
        }
        catch (error) {
            throw new Error(`There was an error fetching an animal by its id in the animal mananger: ${error}`);
        }

        // Get the owner's player object
        let owner: Player;
        try {
            owner = await beastiary.players.fetch(getGuildMember(animal.ownerId, animal.guildId));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player from the player manager: ${error}`);
        }

        // Remove the animal from the player's possession
        owner.removeAnimalIdFromCollection(animal.id);
        owner.removeAnimalIdFromCrew(animal.id);

        // Remove the animal from the cache
        try {
            await this.removeFromCache(animal.id);
        }
        catch (error) {
            throw new Error(`There was an error removing a deleted animal from the cache: ${error}`);
        }

        // Delete the animal's document
        try {
            await animal.delete();
        }
        catch (error) {
            throw new Error(`There was an error deleting an animal object: ${error}`);
        }
    }

    // Searches for an existing animal with a given set of search criteria
    public async searchAnimal(
        searchTerm: string,
        searchOptions?: {
            guildId?: string,
            userId?: string,
            playerObject?: Player,
            positionalList?: "collection" | "crew"
        }): Promise<Animal | undefined> {
        // Pull the potential guild id and player object from the search options (undefined if none)
        const guildId = searchOptions && searchOptions.guildId;
        const userId = searchOptions && searchOptions.userId;
        let playerObject = searchOptions && searchOptions.playerObject;
        const positionalListName = searchOptions && searchOptions.positionalList;

        // If the search is only to be done by nickname
        if (!positionalListName) {
            // Get the animal by its nickname and return the result
            try {
                return await beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(`There was an error finding an animal by a given nickname: ${error}`);
            }
        }
        // If we're out here, it means that animal indexes need to be considered

        // First make sure the search term isn't a numeric index in a player's collection to search
        const searchNumber = Number(searchTerm);

        // If the search term isn't a number (it's a nickname)
        if (isNaN(searchNumber)) {
            // Attempt to get an animal by the nickname provided
            let animalObject: Animal | undefined;
            try {
                animalObject = await beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                throw new Error(`There was an error finding an animal by its nickname: ${error}`);
            }

            // Only return something if an animal was found, if not continue for more checks
            if (animalObject) {
                return animalObject;
            }
        }
        // If the search term is a number
        else {
            // If a player object wasn't provided
            if (!playerObject) {
                // Make sure there's enough info provided to determine the player object
                if (!guildId || !userId) {
                    throw new Error("Insufficient information was provided to searchAnimal for the purpose of searching by animal position.");
                }

                // Get the player object corresponding to the user provided for the search
                try {
                    playerObject = await beastiary.players.fetch(getGuildMember(userId, guildId));
                }
                catch (error) {
                    throw new Error(`There was an error fetching a player object by a guild member while searching an animal: ${error}`);
                }
            }

            let animalId: Types.ObjectId | undefined;
            switch (positionalListName) {
                case "collection": {
                    // Get an animal id by the position in the player's collection
                    animalId = playerObject.getCollectionIdPositional(searchNumber - 1);
                    break;
                }
                case "crew": {
                    // Get an animal id by the position in the player's crew
                    animalId = playerObject.getCrewIdPositional(searchNumber - 1);
                    break;
                }
            }

            // If an animal at the given position was found
            if (animalId) {
                // Get that animal from the cache
                let animalObject: Animal;
                try {
                    animalObject = await this.fetchById(animalId);
                }
                catch (error) {
                    throw new Error(`There was an error fetching a searched animal from the cache: ${error}`);
                }
                
                // Return the resulting animal
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

        // If we're down here, all searches returned nothing
        return undefined;
    }
}