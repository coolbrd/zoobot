import { TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import GameObject from "../GameObject";
import { Species, SpeciesCard } from "./Species";
import { AnimalModel } from '../../../models/Animal';
import { unknownCard } from './UnknownSpecies';
import { stripIndent } from "common-tags";
import { betterSend } from "../../../discordUtility/messageMan";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
import { Player } from "./Player";
import gameConfig from "../../../config/gameConfig";
import BeastiaryClient from "../../../bot/BeastiaryClient";

export class Animal extends GameObject {
    public readonly model = AnimalModel;

    public static readonly fieldNames = {
        speciesId: "speciesId",
        cardId: "cardId",
        userId: "userId",
        guildId: "guildId",
        ownerId: "ownerId",
        nickname: "nickname",
        experience: "experience"
    };

    public readonly fieldRestrictions = {
        [Animal.fieldNames.experience]: {
            nonNegative: true
        }
    };

    protected referenceNames = {
        species: "species",
        owner: "owner"
    }

    public static newDocument(owner: Player, species: Species, card: SpeciesCard): Document {
        return new AnimalModel({
            [Animal.fieldNames.speciesId]: species.id,
            [Animal.fieldNames.cardId]: card._id,
            [Animal.fieldNames.userId]: owner.member.user.id,
            [Animal.fieldNames.guildId]: owner.member.guild.id,
            [Animal.fieldNames.ownerId]: owner.id,
            [Animal.fieldNames.experience]: 0
        });
    }

    constructor(document: Document, beastiaryClient: BeastiaryClient) {
        super(document, beastiaryClient);

        this.references = {
            [this.referenceNames.owner]: {
                cache: beastiaryClient.beastiary.players,
                id: this.ownerId
            },
            [this.referenceNames.species]: {
                cache: beastiaryClient.beastiary.species,
                id: this.speciesId
            }
        }
    }

    public get speciesId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.speciesId);
    }

    public get cardId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.cardId);
    }

    public get userId(): string {
        return this.document.get(Animal.fieldNames.userId);
    }

    public get guildId(): string {
        return this.document.get(Animal.fieldNames.guildId);
    }

    public get ownerId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.ownerId);
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

    public get owner(): Player {
        return this.getReference(this.referenceNames.owner);
    }

    public get species(): Species {
        return this.getReference(this.referenceNames.species);
    }

    public get card(): SpeciesCard {
        const card = this.species.cards.find(speciesCard => {
            return this.cardId.equals(speciesCard._id);
        });

        if (!card) {
            return unknownCard;
        }
        return card;
    }

    public get level(): number {
        return Math.ceil(Math.max(0, Math.log2(this.experience / 50))) + 1;
    }

    public playerIsOwner(player: Player): boolean {
        return this.userId === player.member.user.id && this.guildId === player.member.guild.id;
    }

    private get ownerHasToken(): boolean {
        return this.owner.tokenSpeciesIds.includes(this.species.id);
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

    private giveOwnerToken(): void {
        this.owner.giveToken(this.species);
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
}