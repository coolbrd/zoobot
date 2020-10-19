import mongoose, { Document, Schema, Types } from "mongoose";
import { encounterHandler } from "../beastiary/EncounterHandler";
import DocumentWrapper from "../structures/DocumentWrapper";

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

// A wrapper object for a Mongoose player document
export class Player extends DocumentWrapper {
    constructor(document: Document) {
        super(document, PlayerModel);
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

    // Adds an animal id to the user's collection
    public async addAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.document.updateOne({
                $push: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's collection: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding an animal to its collection: ${error}`);
        }
    }

    // Adds a set of animals at a given base position
    public async addAnimalsPositional(animalIds: Types.ObjectId[], position: number): Promise<void> {
        try {
            await this.document.updateOne({
                $push: {
                    animals: {
                        $each: animalIds,
                        $position: position
                    }
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error adding animals to a player's animal collection: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding animals to its collection: ${error}`);
        }
    }

    // Removes an animal from the player's collection by a given id
    public async removeAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.document.updateOne({
                $pull: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error removing an animal from a player's animal collection: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing an animal from its collection: ${error}`);
        }
    }

    // Removes a set of animals by an array of positions
    public async removeAnimalsPositional(animalPositions: number[]): Promise<Types.ObjectId[]> {
        // Form a list of all animal ids that result from the list of positions given
        const animalIds: Types.ObjectId[] = [];
        for (const position of animalPositions) {
            animalIds.push(this.animalIds[position]);
        }
        
        // Remove all the specified animals from the player's collection (just ids)
        try {
            await this.document.updateOne({
                $pull: {
                    animals: {
                        $in: animalIds
                    }
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error removing animals from a player's animal collection: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing animals from its collection: ${error}`);
        }

        // Return the list of removed animal ids, presumably so they can be added again in a different order
        return animalIds;
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