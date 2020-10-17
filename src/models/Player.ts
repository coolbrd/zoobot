import mongoose, { Document, Schema, Types } from "mongoose";

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
    encountersLeft: {
        type: Number,
        required: true
    },
    lastCapture: {
        type: Schema.Types.Date,
        required: false
    },
    totalCaptures: {
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

    public get encountersLeft(): number {
        return this.document.get("encountersLeft");
    }

    public get lastCapture(): Date | undefined {
        return this.document.get("lastCapture");
    }

    public get totalCaptures(): number {
        return this.document.get("totalCaptures");
    }

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
        const animalIds: Types.ObjectId[] = [];
        for (const position of animalPositions) {
            animalIds.push(this.animalIds[position]);
        }
        
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

        return animalIds;
    }

    public async useEncounter(): Promise<void> {
        try {
            await this.document.updateOne({
                $inc: {
                    encountersLeft: -1
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error decrementing a player's encounter count: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's document after using an encounter: ${error}`);
        }
    }

    public async captureAnimal(): Promise<void> {
        try {
            await this.document.updateOne({
                lastCapture: new Date()
            });
        }
        catch (error) {
            throw new Error(`There was an error updating a player's last capture field: ${error}`);
        }

        try {
            await this.document.updateOne({
                $inc: {
                    totalCaptures: 1
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error incrementing a player's total captures field: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's document after updating their last capture: ${error}`);
        }
    }
}