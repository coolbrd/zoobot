import { GuildMember } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";
import { beastiary } from "../beastiary/Beastiary";
import GameObject from "../structures/GameObject";
import { Species, SpeciesCard } from "./Species";

export const animalSchema = new Schema({
    ownerId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    speciesId: {
        type: Schema.Types.ObjectId,
        ref: "Species",
        required: true
    },
    cardId: {
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

    // The default template for creating a new animal document
    public static newDocument(owner: GuildMember, species: Species, card: SpeciesCard): Document {
        return new AnimalModel({
            ownerId: owner.user.id,
            guildId: owner.guild.id,
            speciesId: species.id,
            cardId: card._id,
            experience: 0
        });
    }

    // The object representations of this animal object's fields
    private _species: Species | undefined;
    private _card: SpeciesCard | undefined;

    public get ownerId(): string {
        return this.document.get("ownerId");
    }

    public get guildId(): string {
        return this.document.get("guildId");
    }

    public get speciesId(): Types.ObjectId {
        return this.document.get("speciesId");
    }

    public get cardId(): Types.ObjectId {
        return this.document.get("cardId");
    }

    public get nickname(): string | undefined {
        return this.document.get("nickname");
    }

    public set nickname(nickname: string | undefined) {
        this.setField("nickname", nickname);
    }

    public get experience(): number {
        return this.document.get("experience");
    }

    public set experience(experience: number) {
        this.setField("experience", experience);
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

    public get species(): Species {
        if (!this._species) {
            throw new Error("Tried to get an animal's species before it was loaded.");
        }

        return this._species;
    }

    public get card(): SpeciesCard {
        if (!this._card) {
            throw new Error("Tried to get an animal's card before it was loaded.");
        }

        return this._card;
    }

    // Loads this animal's species
    private async loadSpecies(): Promise<void> {
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
        // Set the animal's card to the one that corresponds to this animal's card id
        this._card = this.species.cards.find(speciesCard => {
            return this.cardId.equals(speciesCard._id);
        });

        // Make sure that an card was found from that search
        if (!this.card) {
            throw new Error("An animal's card couldn't be found in the card of its species.");
        }
    }

    // Load all the animal's fields
    public async loadFields(): Promise<void> {
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
}