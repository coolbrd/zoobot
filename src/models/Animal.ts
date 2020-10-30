import { GuildMember } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";
import { beastiary } from "../beastiary/Beastiary";
import GameObject from "../structures/GameObject";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import { Species, SpeciesCard } from "./Species";

export class Animal extends GameObject {
    public readonly model = AnimalModel;

    public static readonly fieldNames = {
        ownerId: "ownerId",
        guildId: "guildId",
        speciesId: "speciesId",
        cardId: "cardId",
        nickname: "nickname",
        experience: "experience"
    };

    public static newDocument(owner: GuildMember, species: Species, card: SpeciesCard): Document {
        return new AnimalModel({
            [Animal.fieldNames.ownerId]: owner.user.id,
            [Animal.fieldNames.guildId]: owner.guild.id,
            [Animal.fieldNames.speciesId]: species.id,
            [Animal.fieldNames.cardId]: card._id,
            [Animal.fieldNames.experience]: 0
        });
    }

    private _species: Species | undefined;
    private _card: SpeciesCard | undefined;

    public get ownerId(): string {
        return this.document.get(Animal.fieldNames.ownerId);
    }

    public get guildId(): string {
        return this.document.get(Animal.fieldNames.guildId);
    }

    public get speciesId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.speciesId);
    }

    public get cardId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.cardId);
    }

    public get nickname(): string | undefined {
        return this.document.get(Animal.fieldNames.nickname);
    }

    public set nickname(nickname: string | undefined) {
        this.setField(Animal.fieldNames.nickname, nickname);
    }

    public get experience(): number {
        return this.document.get(Animal.fieldNames.experience);
    }

    public set experience(experience: number) {
        this.setField(Animal.fieldNames.experience, experience);
    }

    public get displayName(): string {
        return this.nickname || capitalizeFirstLetter(this.species.commonNames[0]);
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

    private async loadSpecies(): Promise<void> {
        try {
            this._species = await beastiary.species.fetchExistingById(this.speciesId);
        }
        catch (error) {
            throw new Error(`There was an error fetching a species by its id when loading an animal object: ${error}`);
        }
    }

    private loadCard(): void {
        this._card = this.species.cards.find(speciesCard => {
            return this.cardId.equals(speciesCard._id);
        });

        if (!this.card) {
            throw new Error("An animal's card couldn't be found in the card of its species.");
        }
    }

    public async loadFields(): Promise<void> {
        try {
            await this.loadSpecies();
        }
        catch (error) {
            throw new Error(`There was an error loading an animal's species: ${error}`);
        }

        this.loadCard();
    }
}

const animalSchema = new Schema({
    [Animal.fieldNames.ownerId]: {
        type: String,
        required: true
    },
    [Animal.fieldNames.guildId]: {
        type: String,
        required: true
    },
    [Animal.fieldNames.speciesId]: {
        type: Schema.Types.ObjectId,
        ref: "Species",
        required: true
    },
    [Animal.fieldNames.cardId]: {
        type: Schema.Types.ObjectId,
        required: true
    },
    [Animal.fieldNames.nickname]: {
        type: String,
        required: false
    },
    [Animal.fieldNames.experience]: {
        type: Number,
        required: true
    }
});

export const AnimalModel = mongoose.model("Animal", animalSchema);

// Index animals by their nickname so they can be easily searched by that
AnimalModel.collection.createIndex({ nickname: "text" });