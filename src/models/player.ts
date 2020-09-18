import mongoose, { Document, Schema, Types } from "mongoose";

import { AnimalObject, animalSchema, AnimalTemplate } from "./animal";

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
        type: [animalSchema],
        required: true
    }
});

export const Player = mongoose.model('Player', playerSchema);

// A wrapper object for a Mongoose player document
export class PlayerObject {
    private readonly document: Document;

    constructor(playerDocument: Document) {
        this.document = playerDocument;
    }

    public getUserId(): string {
        return this.document.get('userId');
    }

    public getGuildId(): string {
        return this.document.get('guildId');
    }

    public getAnimals(): AnimalObject[] {
        const animalObjects: AnimalObject[] = [];
        this.document.get('animals').forEach((animalDocument: Document) => {
            animalObjects.push(new AnimalObject(animalDocument));
        });
        return animalObjects;
    }

    public async addAnimal(animal: AnimalTemplate): Promise<void> {
        // Attempt to add the animal to the player's inventory
        try {
            await this.document.updateOne({
                $push: {
                    animals: animal
                }
            });
        }
        catch (error) {
            console.error('There was an error trying to add a new animal to a player\'s inventory.');
            throw new Error(error);
        }
    }

    public async removeAnimal(animalId: Types.ObjectId): Promise<boolean> {
        let result: { nModified: number }
        try {
            result = await this.document.updateOne({
                $pull: {
                    animals: {
                        _id: animalId
                    }
                }
            }).exec();
        }
        catch (error) {
            console.error('There was an error trying to remove an animal document from a player\'s inventory.');
            throw new Error('Error');
        }

        // If nothing was removed from the user's inventory
        if (result.nModified < 1) {
            // Don't throw an error, but just indicate that nothing happened
            return false;
        }
        
        // Return true after the animal has been removed
        return true;
    }
}