import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";
import getGuildMember from "../discordUtility/getGuildMember";
import { Animal, AnimalObject } from "../models/Animal";
import { PlayerObject } from "../models/Player";
import { SpeciesObject } from "../models/Species";
import CachedValue from "../structures/CachedItem";
import { errorHandler } from "../structures/ErrorHandler";
import { beastiary } from "./Beastiary";

export default class AnimalManager {
    // The current map of cached animal objects
    private readonly cache = new Map<Types.ObjectId, CachedValue<AnimalObject>>();

    // The inactivity time it takes for a animal to get removed from the cache
    private readonly cacheTimeout = 30000;

    // Creates and returns a timeout object used for delaying the deletion of cached animals from the cache
    private createNewTimer(animal: AnimalObject): NodeJS.Timeout {
        return setTimeout(() => {
            // Remove the cached animal from the cache after the given amount of time
            this.cache.delete(animal.getId());
        }, this.cacheTimeout);
    }

    // Gets an animal object by its id
    public async fetchById(id: Types.ObjectId): Promise<AnimalObject> {
        // First check the cache to see if the animal's object already exists in it
        for (const cachedAnimal of this.cache.values()) {
            // If the current animal's id matches
            if (cachedAnimal.value.getId().equals(id)) {
                // Force the animal object to get the most up to date data
                await cachedAnimal.value.refresh();

                // Reset the cached animal's deletion timer
                cachedAnimal.setTimer(this.createNewTimer(cachedAnimal.value));

                // Return the existing animal from the cache
                return cachedAnimal.value;
            }
        }

        let animalDocument: Document | null;
        try {
            animalDocument = await Animal.findById(id);
        }
        catch (error) {
            throw new Error('There was an error finding an existing animal document.');
        }

        if (!animalDocument) {
            throw new Error('An animal id whose document could\'nt be found was attempted to be fetched from the animal cache.');
        }

        const animal = new AnimalObject({ document: animalDocument });

        // Load the animal's information
        await animal.load();

        // Add the animal to the cache by its document's id
        this.cache.set(animal.getId(), new CachedValue<AnimalObject>(animal, this.createNewTimer(animal)));

        // Return the animal
        return animal;
    }

    public async createAnimal(owner: GuildMember, species: SpeciesObject, imageIndex: number): Promise<void> {
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
        const animalDocument = new Animal({
            ownerId: ownerObject.getUserId(),
            guildId: ownerObject.getGuildId(),
            species: species.getId(),
            image: species.getImages()[imageIndex].getId(),
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