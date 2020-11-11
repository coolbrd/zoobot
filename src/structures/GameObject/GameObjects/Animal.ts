import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";
import { beastiary } from "../../../beastiary/Beastiary";
import GameObject from "../GameObject";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
import { Species, SpeciesCard } from "./Species";
import { AnimalModel } from '../../../models/Animal';
import { unknownCard } from './UnknownSpecies';

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
        this.setDocumentField(Animal.fieldNames.nickname, nickname);
    }

    public get experience(): number {
        return this.document.get(Animal.fieldNames.experience);
    }

    public set experience(experience: number) {
        this.setDocumentField(Animal.fieldNames.experience, experience);
    }

    public get value(): number {
        return this.species.baseValue;
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
            this._species = await beastiary.species.fetchById(this.speciesId);
        }
        catch (error) {
            throw new Error(`There was an error fetching a species by its id when loading an animal object: ${error}`);
        }
    }

    private loadCard(): void {
        this._card = this.species.cards.find(speciesCard => {
            return this.cardId.equals(speciesCard._id);
        });

        if (!this._card) {
            this._card = unknownCard;
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
