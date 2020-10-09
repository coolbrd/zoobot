import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";
import getGuildMember from "../discordUtility/getGuildMember";
import { AnimalModel, Animal } from "../models/Animal";
import { PlayerObject } from "../models/Player";
import { Species } from "../models/Species";
import CachedValue from "../structures/CachedItem";
import { errorHandler } from "../structures/ErrorHandler";
import { beastiary } from "./Beastiary";

export default class AnimalManager {
    // The current map of cached animal objects
    private readonly cache = new Map<Types.ObjectId, CachedValue<Animal>>();

    // The inactivity time it takes for a animal to get removed from the cache
    private readonly cacheTimeout = 30000;

    // Creates and returns a timeout object used for delaying the deletion of cached animals from the cache
    private createNewTimer(animal: Animal): NodeJS.Timeout {
        return setTimeout(() => {
            // Remove the cached animal from the cache after the given amount of time
            this.cache.delete(animal.getId());
        }, this.cacheTimeout);
    }

    // Adds an animal object to the cache
    private async addToCache(animal: Animal): Promise<void> {
        // Load the animal's information
        await animal.load();

        // Add the animal to the cache by its document's id
        this.cache.set(animal.getId(), new CachedValue<Animal>(animal, this.createNewTimer(animal)));
    }

    // Removes an animal by a given id from the cache
    private removeFromCache(animalId: Types.ObjectId): void {
        // Get the cached animal
        const cachedAnimal = this.cache.get(animalId);

        // Make sure it exists
        if (!cachedAnimal) {
            throw new Error('Attempted to delete an animal that isn\'t in the animal cache.');
        }

        // Stop the cached animal's removal timer
        cachedAnimal.stopTimer();

        // Remove the animal from the cache
        this.cache.delete(animalId);
    }

    // Gets an animal object by its id
    public async fetchById(id: Types.ObjectId): Promise<Animal> {
        // First check the cache to see if the animal's object already exists in it
        for (const cachedAnimal of this.cache.values()) {
            // If the current animal's id matches
            if (cachedAnimal.value.getId().equals(id)) {
                // Reset the cached animal's deletion timer
                cachedAnimal.setTimer(this.createNewTimer(cachedAnimal.value));

                // Return the existing animal from the cache
                return cachedAnimal.value;
            }
        }

        let animalDocument: Document | null;
        try {
            animalDocument = await AnimalModel.findById(id);
        }
        catch (error) {
            throw new Error('There was an error finding an existing animal document.');
        }

        if (!animalDocument) {
            throw new Error('An animal id whose document could\'nt be found was attempted to be fetched from the animal cache.');
        }

        // Turn the document into an object and add it to the cache
        const animal = new Animal(animalDocument._id);
        await this.addToCache(animal);

        // Return the animal
        return animal;
    }

    // Fetch an animal object by its nickname and guild
    public async fetchByNickName(nickname: string, guildId?: string): Promise<Animal | undefined> {
        // First search the cache for the appropriate animal
        for (const cachedAnimal of this.cache.values()) {
            if (cachedAnimal.value.getNickname() === nickname) {
                if (guildId && cachedAnimal.value.getGuildId() !== guildId) {
                    continue;
                }

                cachedAnimal.setTimer(this.createNewTimer(cachedAnimal.value));

                return cachedAnimal.value;
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
            Object.defineProperty(searchQuery, 'guildId', {
                value: guildId,
                writable: false,
                enumerable: true
            });
        }

        let animalDocument: Document | null;
        // Attempt to find the animal by the given search options
        try {
            animalDocument = await AnimalModel.findOne(searchQuery);
        }
        catch (error) {
            throw new Error('There was an error finding an animal by its nickname.');
        }

        // If no animal was found by the given information, don't return anything
        if (!animalDocument) {
            return undefined;
        }

        // If an animal was found, convert it into an object and add it to the cache
        const animal = new Animal(animalDocument._id);
        await this.addToCache(animal);

        // Return the animal
        return animal;
    }

    public async createAnimal(owner: GuildMember, species: Species, cardIndex: number): Promise<void> {
        // Get the player object of the guild member
        let ownerObject: PlayerObject;
        try {
            ownerObject = await beastiary.players.fetch(owner);
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error getting a player object by a guild member.');
            return;
        }

        // Create the new animal
        const animalDocument = new AnimalModel({
            ownerId: ownerObject.getUserId(),
            guildId: ownerObject.getGuildId(),
            species: species.getId(),
            card: species.getCards()[cardIndex].getId(),
            experience: 0
        });

        // Save the new animal
        try {
            await animalDocument.save();
        }
        catch (error) {
            throw new Error('There was an error saving a new animal.');
        }

        // Add the animal's id to the owner's inventory
        try {
            await ownerObject.addAnimal(animalDocument._id);
        }
        catch (error) {
            throw new Error('There was an error adding a new animal to a player\'s inventory.');
        }

        // Turn the animal into a game object and add it to the cache
        const animal = new Animal(animalDocument._id);
        await this.addToCache(animal);
    }

    // Deletes an animal by a given id
    public async deleteAnimal(animalId: Types.ObjectId): Promise<void> {
        // Get the specified animal
        const animal = await this.fetchById(animalId);

        // Get the owner's player object
        let owner: PlayerObject;
        try {
            owner = await beastiary.players.fetch(getGuildMember(animal.getOwnerId(), animal.getGuildId()));
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error fetching a player from the player manager.');
            return;
        }

        // Remove the animal from the player's inventory
        try {
            await owner.removeAnimal(animal.getId());
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error removing an animal\'s id from it\'s owner\'s inventory.');
            return;
        }

        // Remove the animal from the cache
        this.removeFromCache(animal.getId());

        // Delete the animal's document
        try {
            await animal.delete();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error trying to delete an animal object.');
            return;
        }
    }

    public async searchAnimal(
        searchTerm: string,
        searchOptions?: {
            guildId?: string,
            userId?: string,
            playerObject?: PlayerObject,
            searchByPosition?: boolean
        }): Promise<Animal | undefined> {
        // Pull the potential guild id and player object from the search options (undefined if none)
        const guildId = searchOptions && searchOptions.guildId;
        const userId = searchOptions && searchOptions.userId;
        let playerObject = searchOptions && searchOptions.playerObject;
        const searchByPosition = searchOptions && searchOptions.searchByPosition;

        // If the search is only to be done by nickname
        if (!searchByPosition) {
            // Try to get the animal by its nickname from the cache
            try {
                return await beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                errorHandler.handleError(error, 'There was an error finding an animal by a given nickname.');
                return;
            }
        }
        // If we're out here, it means that animal indexes need to be considered

        // First make sure the search term isn't a numeric index in a player's inventory to search
        const searchNumber = Number(searchTerm);

        // If the search term isn't a number (it's a nickname)
        if (isNaN(searchNumber)) {
            let animalObject: Animal | undefined;
            // Attempt to get an animal by the nickname provided
            try {
                animalObject = await beastiary.animals.fetchByNickName(searchTerm, guildId);
            }
            catch (error) {
                errorHandler.handleError(error, 'There was an error finding an animal by its nickname.');
            }

            // Only return something if an animal was found, if not continue for more checks
            if (animalObject) {
                return animalObject;
            }
        }
        // If the search term is a number
        else {
            // If no player object wasn't provided
            if (!playerObject) {
                // Make sure there's enough info provided to determine the player object
                if (!guildId || !userId) {
                    throw new Error('Insufficient information was provided to searchAnimal for the purpose of searching by animal position.');
                }

                // Get the player object corresponding to the user provided for the search
                try {
                    playerObject = await beastiary.players.fetch(getGuildMember(userId, guildId));
                }
                catch (error) {
                    errorHandler.handleError(error, 'There was an error getting a player object by a guild member.');
                    return;
                }
            }

            // Get the animal by its position in the player's inventory
            const animalObject = playerObject.getAnimalPositional(searchNumber - 1);

            // If an animal at the given position was found
            if (animalObject) {
                // Add it to the cache and return it
                await this.addToCache(animalObject);
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
                errorHandler.handleError(error, 'There was an error finding an animal by its nickname.');
                return;
            }
        }

        // If we're down here, all searches returned nothing
        return undefined;
    }
}