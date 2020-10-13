import mongoose, { Schema, Types } from "mongoose";
import { beastiary } from "../beastiary/Beastiary";

import DocumentWrapper from "../structures/DocumentWrapper";
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
    private _animals: Animal[] | undefined;

    constructor(documentId: Types.ObjectId) {
        super(PlayerModel, documentId);
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

    public get animals(): Animal[] {
        if (!this._animals) {
            throw new Error("A player's animals were attempted to be retrieved before they were loaded.");
        }

        return this._animals;
    }

    public getAnimalPositional(position: number): Animal | undefined {
        if (position < 0 || position >= this.animals.length) {
            return undefined;
        }

        return this.animals[position];
    }

    // Adds an animal id to the user's inventory
    public async addAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.document.updateOne({
                $push: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding an animal to its inventory: ${error}`);
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
            throw new Error(`There was an error adding animals to a player's animal inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after adding animals to its inventory: ${error}`);
        }
    }

    // Removes an animal from the player's inventory by a given id
    public async removeAnimal(animalId: Types.ObjectId): Promise<void> {
        try {
            await this.document.updateOne({
                $pull: {
                    animals: animalId
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error removing an animal from a player's animal inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing an animal from its inventory: ${error}`);
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
            throw new Error(`There was an error removing animals from a player's animal inventory: ${error}`);
        }

        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a player's information after removing animals from its inventory: ${error}`);
        }

        return animalIds;
    }

    public async loadAnimals(): Promise<void> {
        // Don't attempt to load any animals before this player's document is loaded
        if (!this.documentLoaded) {
            throw new Error("A player object's animals were attempted to be loaded before the document was loaded.");
        }

        // If this player's animals are already known/loaded, do nothing
        if (this.animalsLoaded) {
            return;
        }

        // Get this player's list of animal ids
        const animalIds = this.document.get("animals");

        const animals: Animal[] = [];

        // Fetch all animal objects
        await new Promise(resolve => {
            let completed = 0;
            for (const animalId of animalIds) {
                beastiary.animals.fetchById(animalId).then(animal => {
                    animals.push(animal);

                    if (++completed >= animalIds.length) {
                        resolve();
                    }
                }).catch(error => {
                    throw new Error(`There was an error fetching an animal within a player's inventory: ${error}`);
                });
            }
        }).catch(error => {
            throw new Error(`There was an error bulk fetching the animals within a player's inventory: ${error}`);
        });

        // Assign the array of animal objects to this player's inventory
        this._animals = animals;
    }

    public get animalsLoaded(): boolean {
        return Boolean(this._animals);
    }

    public get fullyLoaded(): boolean {
        return super.fullyLoaded && this.animalsLoaded;
    }

    public async load(): Promise<void> {
        // If all player information is already loaded, do nothing
        if (this.fullyLoaded) {
            return;
        }

        try {
            await this.loadDocument();
        }
        catch (error) {
            throw new Error(`There was an error loading a player's document: ${error}`);
        }

        try {
            await this.loadAnimals();
        }
        catch (error) {
            throw new Error(`There was an error loading a player's animals: ${error}`);
        }
    }

    public unload(): void {
        super.unload();
        this._animals = undefined;
    }
}