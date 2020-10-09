import mongoose, { Schema, Types } from "mongoose";

import DocumentWrapper from "../structures/DocumentWrapper";
import { SpeciesCard, Species } from "./Species";

export const animalSchema = new Schema({
    ownerId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    species: {
        type: Schema.Types.ObjectId,
        ref: "Species",
        required: true
    },
    card: {
        type: Schema.Types.ObjectId,
        required: true
    },
    nickname: {
        type: String,
        required: false
    },
    experience: {
        type: Number,
        required: true
    }
});

export const AnimalModel = mongoose.model("Animal", animalSchema);

// Index animals by their nickname so they can be easily searched by that
AnimalModel.collection.createIndex({ nickname: "text" });

// An animal's version of a Mongoose document wrapper
// Allows for animal information to be loaded, reloaded, and set more easily
export class Animal extends DocumentWrapper {
    // The object representations of this animal object's fields
    private species: Species | undefined;
    private card: SpeciesCard | undefined;

    constructor(documentId: Types.ObjectId) {
        super(AnimalModel, documentId);
    }

    public getOwnerId(): string {
        return this.getDocument().get("ownerId");
    }

    public getGuildId(): string {
        return this.getDocument().get("guildId");
    }

    public getSpeciesId(): Types.ObjectId {
        return this.getDocument().get("species");
    }

    public getCardId(): Types.ObjectId {
        return this.getDocument().get("card");
    }

    public getNickname(): string {
        return this.getDocument().get("nickname");
    }

    public getExperience(): number {
        return this.getDocument().get("experience");
    }

    public async setNickname(newNickname: string | null): Promise<void> {
        try {
            await this.getDocument().updateOne({
                $set: {
                    nickname: newNickname
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error trying to change the nickname of an animal document: ${error}`);
        }

        await this.refresh();
    }

    // Gets the species object representing this animal's species
    public getSpecies(): Species {
        if (!this.species) {
            throw new Error("Tried to get an AnimalObject's species before it was loaded.");
        }

        return this.species;
    }

    // Gets the object representing this animal's card
    public getCard(): SpeciesCard {
        if (!this.card) {
            throw new Error("Tried to get an AnimalObject's card before it was loaded.");
        }

        return this.card;
    }

    // Returns this animal's display name, prefers nickname over common name
    public getName(): string {
        return this.getNickname() || this.getSpecies().getCommonNames()[0];
    }

    public speciesLoaded(): boolean {
        return Boolean(this.species);
    }

    public cardLoaded(): boolean {
        return Boolean(this.card);
    }

    // Whether or not every one of this animal's fields are loaded and ready to go
    public fullyLoaded(): boolean {
        return super.fullyLoaded() && this.speciesLoaded() && this.cardLoaded();
    }

    // Loads this animal's species object
    private async loadSpecies(): Promise<void> {
        if (!this.documentLoaded()) {
            throw new Error("An animal's species was attempted to be loaded before its document was loaded.");
        }

        // If this animal's species is already known/loaded, do nothing
        if (this.speciesLoaded()) {
            return;
        }

        // Create a new species object from this animal's known species id
        this.species = new Species(this.getSpeciesId());
        // Load the species object's information
        await this.species.load();
    }

    // Loads this animal's card object
    private loadCard(): void {
        // If this animal's card object is known/loaded, do nothing
        if (this.cardLoaded()) {
            return;
        }

        // Get the array of all cards of the animal's species
        const speciesCards = this.getSpecies().getCards();

        // Set the animal's card to the one that corresponds to this animal's card id
        this.card = speciesCards.find(speciesCard => {
            return this.getCardId().equals(speciesCard.getId());
        });

        // Make sure that an card was found from that search
        if (!this.card) {
            throw new Error("An animal's card couldn't be found in the card of its species.");
        }
    }

    // Load all the animal's fields
    public async load(): Promise<void> {
        try {
            await super.load();
        }
        catch (error) {
            throw new Error(`There was an error loading an animal's inherited information: ${error}`);
        }

        try {
            await this.loadSpecies();
        }
        catch (error) {
            throw new Error(`There was an error loading an animal's species: ${error}`);
        }

        try {
            this.loadCard();
        }
        catch (error) {
            throw new Error(`There was an error loading an animal's card: ${error}`);
        }
    }

    // Unloads all the animal's fields
    public unload(): void {
        super.unload();
        this.species = undefined;
        this.card = undefined;
    }
}