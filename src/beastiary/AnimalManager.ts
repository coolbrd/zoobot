import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";

import getGuildMember from "../discordUtility/getGuildMember";
import { AnimalModel, Animal } from "../models/Animal";
import { Player } from "../models/Player";
import { Species, SpeciesCard } from "../models/Species";
import WrapperCache from "../structures/GameObjectCache";
import { beastiary } from "./Beastiary";

export default class AnimalManager extends WrapperCache<Animal> {
    constructor() {
        super(60000);
    }

    // Gets an animal object by its id
    public async fetchById(id: Types.ObjectId): Promise<Animal> {
        // Check the cache first
        const cachedAnimal = this.getFromCache(id);

        // If the animal is in the cache
        if (cachedAnimal) {
            // Reset the cached animal's deletion timer
            cachedAnimal.setTimer(this.createNewTimer(cachedAnimal.value));

            // Return the existing animal from the cache
            return cachedAnimal.value;
        }

        // Search for the animal in the database
        let animalDocument: Document | null;
        try {
            animalDocument = await AnimalModel.findById(id);
        }
        catch (error) {
            throw new Error("There was an error finding an existing animal document.");
        }

        if (!animalDocument) {
            throw new Error("An animal id whose document couldn't be found was attempted to be fetched from the animal cache.");
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
            if (cachedAnimal.value.nickname === nickname) {
                if (guildId && cachedAnimal.value.guildId !== guildId) {
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
            Object.defineProperty(searchQuery, "guildId", {
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
            throw new Error("There was an error finding an animal by its nickname.");
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

    public async createAnimal(owner: GuildMember, species: Species, card: SpeciesCard): Promise<void> {
        // Get the player object of the guild member
        let ownerObject: Player;
        try {
            ownerObject = await beastiary.players.fetch(owner);
        }
        catch (error) {
            throw new Error(`There was an error fetching a player object by a guild member while creating an animal: ${error}`);
        }

        // Create the new animal
        const animalDocument = new AnimalModel({
            ownerId: ownerObject.userId,
            guildId: ownerObject.guildId,
            species: species.id,
            card: card.id,
            experience: 0
        });

        // Save the new animal
        try {
            await animalDocument.save();
        }
        catch (error) {
            throw new Error(`There was an error saving a new animal: ${error}`);
        }

        // Add the animal's id to the owner's inventory
        try {
            await ownerObject.addAnimal(animalDocument._id);
        }
        catch (error) {
            throw new Error(`There was an error adding a new animal to a player's inventory: ${error}`);
        }

        // Turn the animal into a game object and add it to the cache
        const animal = new Animal(animalDocument._id);

        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to the animal cache: ${error}`);
        }
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

        // Remove the animal from the player's inventory
        try {
            await owner.removeAnimal(animal.id);
        }
        catch (error) {
            throw new Error(`There was an error removing an animal's id from it's owner's inventory: ${error}`);
        }

        // Remove the animal from the cache
        this.removeFromCache(animal.id);

        // Delete the animal's document
        try {
            await animal.delete();
        }
        catch (error) {
            throw new Error(`There was an error trying to delete an animal object: ${error}`);
        }
    }

    public async searchAnimal(
        searchTerm: string,
        searchOptions?: {
            guildId?: string,
            userId?: string,
            playerObject?: Player,
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
                throw new Error(`There was an error finding an animal by a given nickname: ${error}`);
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
                throw new Error(`There was an error finding an animal by its nickname: ${error}`);
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

            // Get the animal by its position in the player's inventory
            const animalObject = playerObject.getAnimalPositional(searchNumber - 1);

            // If an animal at the given position was found
            if (animalObject) {
                // Add it to the cache
                try {
                    await this.addToCache(animalObject);
                }
                catch (error) {
                    throw new Error(`There was an error adding a searched animal to the cache: ${error}`);
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

        // If we're down here, all searches returned nothing
        return undefined;
    }
}