import { GuildMember, TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import { beastiary } from "../../../beastiary/Beastiary";
import GameObject from "../GameObject";
import { Species, SpeciesCard } from "./Species";
import { AnimalModel } from '../../../models/Animal';
import { unknownCard } from './UnknownSpecies';
import { stripIndent } from "common-tags";
import { betterSend } from "../../../discordUtility/messageMan";
import getGuildMember from "../../../discordUtility/getGuildMember";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
import { Player } from "./Player";
import gameConfig from "../../../config/gameConfig";

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

    public readonly fieldRestrictions = {
        [Animal.fieldNames.experience]: {
            nonNegative: true
        }
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

    private _owner: Player | undefined;
    private _species: Species | undefined;
    private _card: SpeciesCard | undefined;

    constructor(document: Document) {
        super(document);
    }

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

    private addExperienceAndCheckForLevelUp(experience: number): boolean {
        const previousLevel = this.level;

        this.experience += experience;

        if (this.level > previousLevel) {
            return true;
        }
        return false;
    }

    private tokenDropChance(target: number): boolean {
        const tokenChance = Math.random() * gameConfig.tokenDropChance;
        
        if (tokenChance <= target) {
            return true;
        }
        return false;
    }

    private ownerHasToken(): boolean {
        return this.owner.tokenSpeciesIds.includes(this.species.id);
    }

    private giveOwnerToken(): void {
        this.owner.giveToken(this.species.id);
    }

    public addExperienceInChannel(experience: number, channel: TextChannel): void {
        const levelUp = this.addExperienceAndCheckForLevelUp(experience);

        if (levelUp) {
            betterSend(channel, `Congratulations ${this.owner.member.user}, ${this.displayName} grew to level ${this.level}!`);
        }

        if (!this.ownerHasToken) {
            const dropToken = this.tokenDropChance(experience);

            if (dropToken) {
                this.giveOwnerToken();

                betterSend(channel, stripIndent`
                    Oh? ${this.owner.member.user}, ${this.displayName} dropped something!

                    **${capitalizeFirstLetter(this.species.token)}** was added to your token collection!
                `);
            }
        }
    }

    public get value(): number {
        return this.species.baseValue;
    }

    public get displayName(): string {
        return this.nickname || capitalizeFirstLetter(this.species.commonNames[0]);
    }

    public get owner(): Player {
        if (!this._owner) {
            throw new Error(stripIndent`
                Tried to get an animal's owner before it was loaded.

                Animal: ${this.debugString}
            `);
        }

        return this._owner;
    }

    public get species(): Species {
        if (!this._species) {
            throw new Error(stripIndent`
                Tried to get an animal's species before it was loaded.

                Animal: ${this.debugString}
            `);
        }

        return this._species;
    }

    public get card(): SpeciesCard {
        if (!this._card) {
            throw new Error(stripIndent`
                Tried to get an animal's card before it was loaded.

                Animal: ${this.debugString}
            `);
        }

        return this._card;
    }

    public get level(): number {
        return Math.ceil(Math.max(0, Math.log2(this.experience / 25))) + 1;
    }

    private async loadOwner(): Promise<void> {
        const ownerGuildMember = getGuildMember(this.ownerId, this.guildId);
        try {
            this._owner = await beastiary.players.fetch(ownerGuildMember);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal's owner.

                Animal: ${this.debugString}
                Owner member: ${JSON.stringify(ownerGuildMember)}

                ${error}
            `);
        }
    }

    private async loadSpecies(): Promise<void> {
        try {
            this._species = await beastiary.species.fetchById(this.speciesId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a species by its id when loading an animal object.

                Animal: ${this.debugString}
                
                ${error}
            `);
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
            await this.loadOwner();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading an animal's owner.

                Animal: ${this.debugString}
                
                ${error}
            `);
        }

        try {
            await this.loadSpecies();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading an animal's species.

                Animal: ${this.debugString}
                
                ${error}
            `);
        }

        this.loadCard();
    }
}