import { TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import GameObject from "../GameObject";
import { Species, SpeciesCard } from "./Species";
import { AnimalModel, animalSchemaDefinition } from '../../../models/Animal';
import { unknownCard } from './UnknownSpecies';
import { stripIndent } from "common-tags";
import { betterSend } from "../../../discordUtility/messageMan";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
import { Player } from "./Player";
import gameConfig from "../../../config/gameConfig";
import BeastiaryClient from "../../../bot/BeastiaryClient";

interface ExperienceGainReceipt {
    xpGiven: number,
    xpTaken: number,
    levelUp: boolean,
    essence: number
}

export class Animal extends GameObject {
    public readonly model = AnimalModel;
    public readonly schemaDefinition = animalSchemaDefinition;

    public static readonly fieldNames = {
        speciesId: "speciesId",
        cardId: "cardId",
        userId: "userId",
        guildId: "guildId",
        ownerId: "ownerId",
        nickname: "nickname",
        experience: "experience"
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

    public set userId(userId: string) {
        this.setDocumentField(Animal.fieldNames.userId, userId);
    }

    public get guildId(): string {
        return this.document.get(Animal.fieldNames.guildId);
    }

    public get ownerId(): Types.ObjectId {
        return this.document.get(Animal.fieldNames.ownerId);
    }

    public set ownerId(ownerId: Types.ObjectId) {
        this.setDocumentField(Animal.fieldNames.ownerId, ownerId);
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
        const levelScaler = 1 + (this.level - 1) / 10;

        return Math.floor(this.species.baseValue * levelScaler);
    }

    public get isOwnersFavorite(): boolean {
        if (this.owner.favoriteAnimalId) {
            return this.owner.favoriteAnimalId.equals(this.id);
        }
        return false;
    }

    public get displayName(): string {
        let displayName = this.nickname || capitalizeFirstLetter(this.species.commonNames[0]);

        if (this.isOwnersFavorite) {
            displayName += " 💕";
        }

        return displayName;
    }

    public get showcaseDisplayName(): string {
        const levelEmoji = this.beastiaryClient.beastiary.emojis.getAnimalLevelEmoji(this.level);

        return `${levelEmoji} ${this.displayName}`;
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

    private getLevel(xp: number): number {
        return Math.floor(Math.max(1, Math.log(Math.ceil((xp + 1) / 100)) / Math.log(1.75) + 1));
    }

    public get level(): number {
        return this.getLevel(this.experience);
    }

    public get levelCap(): number {
        return this.owner.getSpeciesLevelCap(this.species.id);
    }

    public get nextLevelXp(): number {
        return this.getLevelXpRequirement(this.level + 1);
    }

    public getLevelXpRequirement(level: number): number {
        return 100 * Math.floor(Math.pow(1.75, level - 1));
    }

    public playerIsOwner(player: Player): boolean {
        return this.userId === player.member.user.id && this.guildId === player.member.guild.id;
    }

    private get ownerHasToken(): boolean {
        return this.owner.hasToken(this.species.id);
    }

    private performDropChance(target: number): boolean {
        const tokenChance = Math.random() * gameConfig.tokenDropChance;
        
        if (tokenChance <= target) {
            return true;
        }
        return false;
    }

    private giveOwnerToken(): void {
        this.owner.giveToken(this.species);
    }

    private potentiallyDropTokenOrEssence(chance: number, channel: TextChannel): void {
        const dropSuccess = this.performDropChance(chance);

        if (dropSuccess) {
            let dropString = `Oh? ${this.owner.member.user}, ${this.displayName} dropped something!\n\n`;

            if (!this.ownerHasToken) {
                this.giveOwnerToken();

                const tokenEmoji = this.beastiaryClient.beastiary.emojis.getByName("token");
                dropString += `${tokenEmoji} **${capitalizeFirstLetter(this.species.token)}** was added to your token collection!`;
            }
            else {
                this.owner.addEssence(this.species.id, 5);
                const essenceEmoji = this.beastiaryClient.beastiary.emojis.getByName("essence");

                dropString += `+**5**${essenceEmoji} (${this.species.commonNames[0]})`;
            }

            betterSend(channel, dropString);
        }
    }

    private addExperienceAndCheckForLevelUp(experience: number): ExperienceGainReceipt {
        const previousExperience = this.experience;
        const previousLevel = this.level;

        if (this.level < this.levelCap) {
            this.experience += experience;
        }

        let levelUp = false;
        
        if (this.level > previousLevel) {
            if (this.level === this.levelCap) {
                this.experience = Math.min(this.experience, this.getLevelXpRequirement(this.levelCap));
            }

            levelUp = true;
        }
        
        const xpReceipt: ExperienceGainReceipt = {
            xpGiven: experience,
            xpTaken: this.experience - previousExperience,
            levelUp: levelUp,
            essence: 0
        }

        return xpReceipt;
    }

    public addExperienceInChannel(experience: number, channel: TextChannel): ExperienceGainReceipt {
        const xpReceipt = this.addExperienceAndCheckForLevelUp(experience);

        if (xpReceipt.levelUp) {
            xpReceipt.essence = 1;

            this.owner.addEssence(this.species.id, xpReceipt.essence);
            const essenceEmoji = this.beastiaryClient.beastiary.emojis.getByName("essence");

            betterSend(channel, stripIndent`
                Congratulations ${this.owner.member.user}, ${this.displayName} grew to level ${this.level}!
                +**${xpReceipt.essence}**${essenceEmoji} (${this.species.commonNames[0]})
            `);
        }

        this.potentiallyDropTokenOrEssence(experience, channel);

        return xpReceipt;
    }

    public async changeOwner(newOwnerId: Types.ObjectId): Promise<void> {
        let newOwner: Player | undefined;
        try {
            newOwner = await this.beastiaryClient.beastiary.players.fetchById(newOwnerId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal's new owner player upon attempting to change its owner.

                New owner id: ${newOwnerId}
                Animal: ${this.debugString}

                ${error}
            `);
        }

        if (!newOwner) {
            throw new Error(stripIndent`
                An invalid player id was given to an animal when attempting to change its owner.

                New owner id: ${newOwnerId}
                Animal: ${this.debugString}
            `);
        }

        this.ownerId = newOwner.id;
        this.userId = newOwner.member.user.id;

        try {
            await this.loadFields();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error reloading an animal's references after an owner change.
            `);
        }
    }
}