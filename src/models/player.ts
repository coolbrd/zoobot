import mongoose, { Document, Schema, Types } from "mongoose";

import DocumentWrapper from '../structures/documentWrapper';
import { AnimalObject } from "./animal";

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
    }
});

export const Player = mongoose.model('Player', playerSchema);

// A wrapper object for a Mongoose player document
export class PlayerObject extends DocumentWrapper {
    // This player's inventory of animal objects
    private animals: AnimalObject[] | undefined;

    public getUserId(): string {
        return this.getDocument().get('userId');
    }

    public getGuildId(): string {
        return this.getDocument().get('guildId');
    }

    public getAnimalIds(): Types.ObjectId[] {
        return this.getDocument().get('animals');
    }

    public getAnimals(): AnimalObject[] {
        if (!this.animals) {
            throw new Error('A player\'s animals were attempted to be retrieved before they were loaded.');
        }

        return this.animals;
    }

    // Adds an animal id to the user's inventory
    public async addAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.getDocument().updateOne({
                $push: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error('There was an error adding an animal to a player\'s inventory.');
        }
    }

    // Adds a set of animals at a given base position
    public async addAnimalsPositional(animalIds: Types.ObjectId[], position: number): Promise<void> {
        try {
            await this.getDocument().updateOne({
                $push: {
                    animals: {
                        $each: animalIds,
                        $position: position
                    }
                }
            });
        }
        catch (error) {
            throw new Error('There was an error adding animals to a player\'s animal inventory.');
        }
    }

    // Removes an animal from the player's inventory by a given id
    public async removeAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.getDocument().updateOne({
                $pull: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error('There was an error removing an animal from a player\'s animal inventory.');
        }
    }

    // Removes a set of animals by an array of positions
    public async removeAnimalsPositional(animalPositions: number[]): Promise<Types.ObjectId[]> {
        const animalIds: Types.ObjectId[] = [];
        for (const position of animalPositions) {
            animalIds.push(this.getAnimalIds()[position]);
        }
        
        try {
            await this.getDocument().updateOne({
                $pull: {
                    animals: {
                        $in: animalIds
                    }
                }
            });
        }
        catch (error) {
            throw new Error('There was an error removing animals from a player\'s animal inventory.');
        }

        return animalIds;
    }

    public async loadDocument(): Promise<void> {
        // If this player's document is already known, do nothing
        if (this.documentLoaded()) {
            return;
        }

        let playerDocument: Document | null;
        // Find and set this player's document
        try {
            playerDocument = await Player.findById(this.getId());
        }
        catch (error) {
            throw new Error('There was an error finding a player document by an id.');
        }

        if (!playerDocument) {
            throw new Error('A player object couldn\'t find a corresponding document with its given id.');
        }

        this.setDocument(playerDocument);
    }

    public async loadAnimals(): Promise<void> {
        // Don't attempt to load any animals before this player's document is loaded
        if (!this.documentLoaded()) {
            throw new Error('A player object\'s animals were attempted to be loaded before the document was loaded.');
        }

        // If this player's animals are already known/loaded, do nothing
        if (this.animalsLoaded()) {
            return;
        }

        // Get this player's list of animal ids
        const animalIds = this.getDocument().get('animals');

        // For every animal id, add a new animal object of that id to this player's inventory
        const animalObjects: AnimalObject[] = [];
        animalIds.forEach((animalId: Types.ObjectId) => {
            animalObjects.push(new AnimalObject({documentId: animalId}));
        });

        // Load all animal objects
        animalObjects.length && await new Promise(resolve => {
            let completed = 0;
            for (const animalObject of animalObjects) {
                animalObject.load().then(() => {
                    if (++completed >= animalObjects.length) {
                        resolve();
                    }
                });
            }
        })

        // Assign the array of animal objects to this player's inventory
        this.animals = animalObjects;
    }

    public animalsLoaded(): boolean {
        return Boolean(this.animals);
    }

    public fullyLoaded(): boolean {
        return super.fullyLoaded() && this.animalsLoaded();
    }

    public async load(): Promise<void> {
        // If all player information is already loaded, do nothing
        if (this.fullyLoaded()) {
            return;
        }

        await this.loadDocument();
        await this.loadAnimals();
    }

    public unload(): void {
        super.unload();
        this.animals = undefined;
    }
}