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

        const animal = new Animal(animalDocument._id);

        // Load the animal's information
        await animal.load();

        // Add the animal to the cache by its document's id
        this.cache.set(animal.getId(), new CachedValue<Animal>(animal, this.createNewTimer(animal)));

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

                await cachedAnimal.value.refresh();

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

        // If an animal was found, convert it into an object
        const animal = new Animal(animalDocument._id);

        // Load the animal
        await animal.load();

        // Add the animal to the cache
        this.cache.set(animal.getId(), new CachedValue(animal, this.createNewTimer(animal)));

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
    }

    // Deletes an animal by a given id
    public async deleteAnimal(animalId: Types.ObjectId): Promise<void> {
        // Get the specified animal
        const animal = await this.fetchById(animalId);

        // Get the animal's owner
        const ownerGuildMember = getGuildMember(animal.getOwnerId(), animal.getGuildId());

        // Get the owner's player object
        let owner: PlayerObject;
        try {
            owner = await beastiary.players.fetch(ownerGuildMember);
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

        // Delete the animal's document
        try {
            await animal.delete();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error trying to delete an animal object.');
            return;
        }
    }
}