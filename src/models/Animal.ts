import { GuildMember } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";
import { beastiary } from "../beastiary/Beastiary";
import GameObject from "../structures/GameObject";
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

// An animal game object
export class Animal extends GameObject {
    public readonly model = AnimalModel;

    // The object representations of this animal object's fields
    private _species: Species | undefined;
    private _card: SpeciesCard | undefined;

    // The amount of experience the animal has gained since experience was last saved to the database
    private experienceChunk = 0;
    // The amount of experience required before a database save is initiated
    private readonly experienceSaveThreshold = 10;

    public static newDocument(owner: GuildMember, species: Species, card: SpeciesCard): Document {
        // Create the new animal
        return new AnimalModel({
            ownerId: owner.user.id,
            guildId: owner.guild.id,
            species: species.id,
            card: card.id,
            experience: 0
        });
    }

    public get ownerId(): string {
        return this.document.get("ownerId");
    }

    public get guildId(): string {
        return this.document.get("guildId");
    }

    public get speciesId(): Types.ObjectId {
        return this.document.get("species");
    }

    public get cardId(): Types.ObjectId {
        return this.document.get("card");
    }

    public get nickname(): string {
        return this.document.get("nickname");
    }

    public get experience(): number {
        return this.document.get("experience");
    }

    // Gets the species object representing this animal's species
    public get species(): Species {
        if (!this._species) {
            throw new Error("Tried to get an animal's species before it was loaded.");
        }

        return this._species;
    }

    // Gets the object representing this animal's card
    public get card(): SpeciesCard {
        if (!this._card) {
            throw new Error("Tried to get an animal's card before it was loaded.");
        }

        return this._card;
    }

    // Returns this animal's display name, preferring nickname over common name
    public get name(): string {
        return this.nickname || this.species.commonNames[0];
    }

    public get speciesLoaded(): boolean {
        return Boolean(this._species);
    }

    public get cardLoaded(): boolean {
        return Boolean(this._card);
    }

    // Whether or not every one of this animal's fields are loaded and ready to go
    public get fullyLoaded(): boolean {
        return super.fullyLoaded && this.speciesLoaded && this.cardLoaded;
    }

    // Sets or resets the animal's nickname
    public async setNickname(newNickname: string | null): Promise<void> {
        // Update the animal's document via an atomic operation (does not affect document in memory)
        try {
            await this.document.updateOne({
                $set: {
                    nickname: newNickname
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error trying to change the nickname of an animal document: ${error}`);
        }

        // Refresh the animal's document
        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing an animal's document after setting its nickname: ${error}`);
        }
    }

    // Adds some experience to the animal
    // Only commits changes to the database after a significant amount of experience has been added
    public async addExperience(amount: number, saveAnyway?: boolean): Promise<void> {
        // Update this document's experience in memory
        this.document.set("experience", this.experience + amount);

        // Add the experience gained to the current chunk of experience being tracked
        this.experienceChunk += amount;
        // If the amount of experience the animal has gained since the last save crosses the threshold, or it's been instructed to save anyway
        if (this.experienceChunk >= this.experienceSaveThreshold || saveAnyway) {
            // Save the animal's current chunk of experience to the database
            try {
                await this.document.updateOne({
                    $inc: {
                        experience: this.experienceChunk
                    }
                });
            }
            catch (error) {
                throw new Error(`There was an error adding experience to an animal: ${error}`);
            }

            // Reset the current chunk of experience
            this.experienceChunk = 0;
        }
    }

    // Loads this animal's species
    private async loadSpecies(): Promise<void> {
        if (!this.documentLoaded) {
            throw new Error("An animal's species was attempted to be loaded before its document was loaded.");
        }

        // If this animal's species is already known/loaded, do nothing
        if (this.speciesLoaded) {
            return;
        }

        // Create a new species object from this animal's known species id
        try {
            this._species = await beastiary.species.fetchExistingById(this.speciesId);
        }
        catch (error) {
            throw new Error(`There was an error fetching a species by its id when loading an animal object: ${error}`);
        }
    }

    // Loads this animal's card object
    private loadCard(): void {
        // If this animal's card object is known/loaded, do nothing
        if (this.cardLoaded) {
            return;
        }

        // Get the array of all cards of the animal's species
        const speciesCards = this.species.cards;

        // Set the animal's card to the one that corresponds to this animal's card id
        this._card = speciesCards.find(speciesCard => {
            return this.cardId.equals(speciesCard.id);
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

    // Saves any chunks of unsaved experience so it doesn't get lost
    public async finalize(): Promise<void> {
        try {
            await this.addExperience(0, true);
        }
        catch (error) {
            throw new Error(`There was an error finalizing an animal's experience before it was unloaded: ${error}`);
        }
    }

    // Unloads all the animal's fields
    public async unload(): Promise<void> {
        try {
            await super.unload();
        }
        catch (error) {
            throw new Error(`There was an error unloading an animal's inherited information: ${error}`);
        }
        this._species = undefined;
        this._card = undefined;
    }
}