import { User } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";
import { client } from "..";
import { encounterHandler } from "../beastiary/EncounterHandler";
import GameObject from "../structures/GameObject";

const playerSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    animals: {
        type: [Schema.Types.ObjectId],
        required: true
    },
    crewAnimals: {
        type: [Schema.Types.ObjectId],
        required: false
    },
    freeCapturesLeft: {
        type: Number,
        required: true
    },
    lastCaptureReset: {
        type: Schema.Types.Date,
        required: false
    },
    totalCaptures: {
        type: Number,
        required: true
    },
    freeEncountersLeft: {
        type: Number,
        required: true
    },
    lastEncounterReset: {
        type: Schema.Types.Date,
        required: false
    },
    totalEncounters: {
        type: Number,
        required: true
    }
});

export const PlayerModel = mongoose.model("Player", playerSchema);

// A player game object
export class Player extends GameObject {
    public readonly model = PlayerModel;

    // The player's associated Discord user object
    public readonly user: User;

    constructor(document: Document) {
        super(document);

        // Find the user object associated with this player's user id
        const potentialUser = client.users.resolve(this.userId);
        if (!potentialUser) {
            throw new Error(`A new player object with an unknown user id was created.`);
        }
        this.user = potentialUser;
    }

    public get userId(): string {
        return this.document.get("userId");
    }

    public get guildId(): string {
        return this.document.get("guildId");
    }

    public get animalIds(): Types.ObjectId[] {
        return this.document.get("animals");
    }

    public get crewAnimalIds(): Types.ObjectId[] {
        return this.document.get("crewAnimals");
    }

    // Private because it doesn't necessarily represent the most recent information
    private get freeCapturesLeft(): number {
        return this.document.get("freeCapturesLeft");
    }

    public get lastCaptureReset(): Date | undefined {
        return this.document.get("lastCaptureReset");
    }

    public get totalCaptures(): number {
        return this.document.get("totalCaptures");
    }

    private get freeEncountersLeft(): number {
        return this.document.get("freeEncountersLeft");
    }

    public get lastEncounterReset(): Date | undefined {
        return this.document.get("lastEncounterReset");
    }

    public get totalEncounters(): number {
        return this.document.get("totalEncounters");
    }

    // Gets an animal id by its position in the player's inventory
    public getAnimalIdPositional(position: number): Types.ObjectId | undefined {
        if (position < 0 || position >= this.animalIds.length) {
            return undefined;
        }

        return this.animalIds[position];
    }

    // Adds an animal id to a list within the player's document
    private async addAnimalIdToList(animalId: Types.ObjectId, fieldName: string): Promise<void> {
        // Add the animal id to the specified list
        try {
            await this.document.updateOne({
                $push: {
                    [fieldName]: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's list: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding an animal to a list: ${error}`);
        }
    }

    // Adds an animal to a player's animal collection
    public async addAnimalToCollection(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.addAnimalIdToList(animalId, "animals");
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's collection: ${error}`);
        }
    }

    // Adds an animal to a player's crew of selected animals
    public async addAnimalToCrew(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.addAnimalIdToList(animalId, "crewAnimals");
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's crew: ${error}`);
        }
    }

    // Adds a set of animals at a given base position
    private async addAnimalIdsPositional(animalIds: Types.ObjectId[], position: number, fieldName: string): Promise<void> {
        // Insert all animal ids into the specified list field starting at the given position
        try {
            await this.document.updateOne({
                $push: {
                    [fieldName]: {
                        $each: animalIds,
                        $position: position
                    }
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error adding animals positionally to a player's list: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding animals positionally to a player's list: ${error}`);
        }
    }

    public async addAnimalsToCollectionPositional(animalIds: Types.ObjectId[], position: number): Promise<void> {
        try {
            await this.addAnimalIdsPositional(animalIds, position, "animals");
        }
        catch (error) {
            throw new Error(`There was an error positionally adding animals to a player's collection.`);
        }
    }

    // Removes an animal from the player's collection by a given id
    private async removeAnimalIdFromList(animalId: Types.ObjectId, fieldName: string): Promise<void> {
        try {
            await this.document.updateOne({
                $pull: {
                    [fieldName]: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error removing an animal from a player's list: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing an animal from its list: ${error}`);
        }
    }

    public async removeAnimalFromCollection(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.removeAnimalIdFromList(animalId, "animals");
        }
        catch (error) {
            throw new Error(`There was an error removing an animal from a player's collection: ${error}`);
        }
    }

    public async removeAnimalFromCrew(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.removeAnimalIdFromList(animalId, "crewAnimals");
        }
        catch (error) {
            throw new Error(`There was an error removing an animal from a player's crew: ${error}`);
        }
    }

    // Removes a set of animals by an array of positions
    private async removeAnimalIdsFromListPositional(positions: number[], fieldName: string): Promise<Types.ObjectId[]> {
        // Form a list of all animal ids that result from the list of positions given
        const animalIds: Types.ObjectId[] = [];
        for (const position of positions) {
            animalIds.push(this.animalIds[position]);
        }
        
        // Remove all the specified animals from the player's collection (just ids)
        try {
            await this.document.updateOne({
                $pull: {
                    [fieldName]: {
                        $in: animalIds
                    }
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error removing animals positionally from a player's list: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing animals from its list: ${error}`);
        }

        // Return the list of removed animal ids, presumably so they can be added again in a different order
        return animalIds;
    }

    public async removeAnimalsFromCollectionPositional(positions: number[]): Promise<Types.ObjectId[]> {
        try {
            return await this.removeAnimalIdsFromListPositional(positions, "animals");
        }
        catch (error) {
            throw new Error(`There was an error positionally removing animal ids from a player's collection: ${error}`);
        }
    }

    // Checks if the player has been given their free capture during this capture period, and applies it if necessary
    public async applyCaptureReset(): Promise<void> {
        // If the player hasn't used/recieved their free capture reset during the current period
        if (!this.lastCaptureReset || this.lastCaptureReset.valueOf() < encounterHandler.lastCaptureReset.valueOf()) {
            // Refresh the player's free capture, and mark this reset period as having been used by the player
            try {
                await this.document.updateOne({
                    freeCapturesLeft: 1,
                    lastCaptureReset: encounterHandler.lastCaptureReset
                });
            }
            catch (error) {
                throw new Error(`There was an error setting a player's free captures field: ${error}`);
            }

            try {
                await this.refresh();
            }
            catch (error) {
                throw new Error(`There was an error refreshing a player after resetting their capture period.`);
            }
        }
    }

    // Checks whether or not a player can capture after applying possible capture reset period captures
    public async canCapture(): Promise<boolean> {
        // Give the player their free capture for this period if necessary
        try {
            await this.applyCaptureReset();
        }
        catch (error) {
            throw new Error(`There was an error checking/applying a player's current capture reset period: ${error}`);
        }

        return this.freeCapturesLeft > 0;
    }

    // Called after a player captures an animal, and its stats needs to be updated
    public async captureAnimal(): Promise<void> {
        if (this.freeCapturesLeft <= 0) {
            throw new Error("A player's capture stats were updated as if it captured an animal without any remaining captures.");
        }

        // Increment/decrement values
        try {
            await this.document.updateOne({
                $inc: {
                    freeCapturesLeft: -1,
                    totalCaptures: 1
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error incrementing a player's capture fields: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's document after updating their last capture: ${error}`);
        }
    }

    // Checks if the player has been given their free capture during this capture period, and applies it if necessary
    public async applyEncounterReset(): Promise<void> {
        // If the player hasn't been given their free encounters during this period
        if (!this.lastEncounterReset || this.lastEncounterReset.valueOf() < encounterHandler.lastEncounterReset.valueOf()) {
            // Refresh the player's free encounters, and mark this reset period as having been used by the player
            try {
                await this.document.updateOne({
                    freeEncountersLeft: 5,
                    lastEncounterReset: encounterHandler.lastEncounterReset
                });
            }
            catch (error) {
                throw new Error(`There was an error setting a player's free encounters field: ${error}`);
            }

            try {
                await this.refresh();
            }
            catch (error) {
                throw new Error(`There was an error refreshing a player after resetting their encounter period.`);
            }
        }
    }

    // Gets the player's updated number of encounters remaining after applying necessary resets
    public async encountersLeft(): Promise<number> {
        // Give the player their free encounters for this period if necessary
        try {
            await this.applyEncounterReset();
        }
        catch (error) {
            throw new Error(`There was an error checking/applying a player's current encounter reset period: ${error}`);
        }

        return this.freeEncountersLeft;
    }

    // Checks whether or not a player can encounter an animal
    public async canEncounter(): Promise<boolean> {
        // Determine the player's encounters left (applying potential resets)
        let encountersLeft: number;
        try {
            encountersLeft = await this.encountersLeft();
        }
        catch (error) {
            throw new Error(`There was an error getting a player's remaining number of encounters: ${error}`);
        }

        return encountersLeft > 0;
    }

    // Called when the player encounters an animal and needs to have that action recorded
    public async encounterAnimal(): Promise<void> {
        if (this.freeEncountersLeft <= 0) {
            throw new Error("A player's encounter stats were updated as if it encountered an animal without any remaining encounters.");
        }

        // Increment/decrement values
        try {
            await this.document.updateOne({
                $inc: {
                    freeEncountersLeft: -1,
                    totalEncounters: 1
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error incrementing a player's encounter fields: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's document after performing an encounter: ${error}`);
        }
    }
}