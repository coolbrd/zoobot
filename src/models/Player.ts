import mongoose, { Document, Schema, Types } from "mongoose";

import DocumentWrapper from "../structures/DocumentWrapper";
import { errorHandler } from "../structures/ErrorHandler";
import { Animal } from "./Animal";

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

export const PlayerModel = mongoose.model("Player", playerSchema);

// A wrapper object for a Mongoose player document
export class Player extends DocumentWrapper {
    // This player's inventory of animal objects
    private animals: Animal[] | undefined;

    constructor(documentId: Types.ObjectId) {
        super(PlayerModel, documentId);
    }

    public getUserId(): string {
        return this.getDocument().get("userId");
    }

    public getGuildId(): string {
        return this.getDocument().get("guildId");
    }

    public getAnimalIds(): Types.ObjectId[] {
        return this.getDocument().get("animals");
    }

    public getAnimals(): Animal[] {
        if (!this.animals) {
            throw new Error("A player's animals were attempted to be retrieved before they were loaded.");
        }

        return this.animals;
    }

    public getAnimalPositional(position: number): Animal | undefined {
        const animals = this.getAnimals();

        if (position < 0 || position >= animals.length) {
            return undefined;
        }

        return animals[position];
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
            errorHandler.handleError(error, "There was an error adding an animal to a player's inventory.");
        }

        await this.refresh();
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
            errorHandler.handleError(error, "There was an error adding animals to a player's animal inventory.");
            return;
        }

        await this.refresh();
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
            errorHandler.handleError(error, "There was an error removing an animal from a player's animal inventory.");
            return;
        }

        await this.refresh();
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
            throw new Error("There was an error removing animals from a player's animal inventory.");
        }

        await this.refresh();

        return animalIds;
    }

    public async loadAnimals(): Promise<void> {
        // Don't attempt to load any animals before this player's document is loaded
        if (!this.documentLoaded()) {
            throw new Error("A player object's animals were attempted to be loaded before the document was loaded.");
        }

        // If this player's animals are already known/loaded, do nothing
        if (this.animalsLoaded()) {
            return;
        }

        // Get this player's list of animal ids
        const animalIds = this.getDocument().get("animals");

        // For every animal id, add a new animal object of that id to this player's inventory
        const animals: Animal[] = [];
        animalIds.forEach((animalId: Types.ObjectId) => {
            animals.push(new Animal(animalId));
        });

        // Load all animal objects
        animals.length && await new Promise(resolve => {
            let completed = 0;
            for (const animalObject of animals) {
                animalObject.load().then(() => {
                    if (++completed >= animals.length) {
                        resolve();
                    }
                });
            }
        });

        // Assign the array of animal objects to this player's inventory
        this.animals = animals;
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

        try {
            await this.loadDocument();
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error loading a player's document.");
            return;
        }

        try {
            await this.loadAnimals();
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error loading a player's animals.");
            return;
        }
    }

    public unload(): void {
        super.unload();
        this.animals = undefined;
    }
}