import { GuildMember } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import GameObject from "../structures/GameObject";
import { indexWhere } from "../utility/arraysAndSuch";

export class Player extends GameObject {
    public readonly model = PlayerModel;

    public static readonly fieldNames = {
        userId: "userId",
        guildId: "guildId",
        collectionAnimalIds: "collectionAnimalIds",
        collectionSizeLimit: "collectionSizeLimit",
        crewAnimalIds: "crewAnimalIds",
        freeCapturesLeft: "freeCapturesLeft",
        lastCaptureReset: "lastCaptureReset",
        totalCaptures: "totalCaptures",
        freeEncountersLeft: "freeEncountersLeft",
        lastEncounterReset: "lastEncounterReset",
        totalEncounters: "totalEncounters"
    };

    public static newDocument(guildMember: GuildMember): Document {
        return new PlayerModel({
            [Player.fieldNames.userId]: guildMember.user.id,
            [Player.fieldNames.guildId]: guildMember.guild.id,
            [Player.fieldNames.collectionSizeLimit]: 5,
            [Player.fieldNames.freeCapturesLeft]: 0,
            [Player.fieldNames.lastCaptureReset]: new Date(0),
            [Player.fieldNames.totalCaptures]: 0,
            [Player.fieldNames.freeEncountersLeft]: 0,
            [Player.fieldNames.lastEncounterReset]: new Date(0),
            [Player.fieldNames.totalEncounters]: 0
        });
    }

    public readonly member: GuildMember;

    constructor(document: Document) {
        super(document);

        this.member = getGuildMember(this.userId, this.guildId);
    }

    public get userId(): string {
        return this.document.get(Player.fieldNames.userId);
    }

    public get guildId(): string {
        return this.document.get(Player.fieldNames.guildId);
    }

    public get collectionAnimalIds(): Types.ObjectId[] {
        return this.document.get(Player.fieldNames.collectionAnimalIds);
    }

    public get collectionSizeLimit(): number {
        return this.document.get(Player.fieldNames.collectionSizeLimit);
    }

    public get crewAnimalIds(): Types.ObjectId[] {
        return this.document.get(Player.fieldNames.crewAnimalIds);
    }

    public get freeCapturesLeft(): number {
        this.applyCaptureReset();

        return this.document.get(Player.fieldNames.freeCapturesLeft);
    }

    public set freeCapturesLeft(freeCapturesLeft: number) {
        this.setField(Player.fieldNames.freeCapturesLeft, freeCapturesLeft);
    }

    public get lastCaptureReset(): Date {
        return this.document.get(Player.fieldNames.lastCaptureReset);
    }

    public set lastCaptureReset(lastCaptureReset: Date) {
        this.setField(Player.fieldNames.lastCaptureReset, lastCaptureReset);
    }

    public get totalCaptures(): number {
        return this.document.get(Player.fieldNames.totalCaptures);
    }

    public set totalCaptures(totalCaptures: number) {
        this.setField(Player.fieldNames.totalCaptures, totalCaptures);
    }

    public get freeEncountersLeft(): number {
        this.applyEncounterReset();

        return this.document.get(Player.fieldNames.freeEncountersLeft);
    }

    public set freeEncountersLeft(freeEncountersLeft: number) {
        this.setField(Player.fieldNames.freeEncountersLeft, freeEncountersLeft);
    }

    public get lastEncounterReset(): Date {
        return this.document.get(Player.fieldNames.lastEncounterReset);
    }

    public set lastEncounterReset(lastEncounterReset: Date) {
        this.setField(Player.fieldNames.lastEncounterReset, lastEncounterReset);
    }

    public get totalEncounters(): number {
        return this.document.get(Player.fieldNames.totalEncounters);
    }

    public set totalEncounters(totalEncounters: number) {
        this.setField(Player.fieldNames.totalEncounters, totalEncounters);
    }

    public get hasCaptures(): boolean {
        return this.freeCapturesLeft > 0;
    }

    public get collectionFull(): boolean {
        return this.collectionAnimalIds.length >= this.collectionSizeLimit;
    }

    public get hasCaptureReset(): boolean {
        return this.lastCaptureReset.valueOf() < encounterHandler.lastCaptureReset.valueOf();
    }

    public get canCapture(): boolean {
        return this.hasCaptures && !this.collectionFull;
    }

    public get hasEncounters(): boolean {
        return this.freeEncountersLeft > 0;
    }

    public get hasEncounterReset(): boolean {
        return this.lastEncounterReset.valueOf() < encounterHandler.lastEncounterReset.valueOf();
    }

    public getCollectionIdPositional(position: number): Types.ObjectId | undefined {
        if (position < 0 || position >= this.collectionAnimalIds.length) {
            return undefined;
        }

        return this.collectionAnimalIds[position];
    }

    public getCrewIdPositional(position: number): Types.ObjectId | undefined {
        if (position < 0 || position >= this.crewAnimalIds.length) {
            return undefined;
        }

        return this.crewAnimalIds[position];
    }

    private addAnimalIdToList(baseList: Types.ObjectId[], animalId: Types.ObjectId): void {
        this.modify();

        baseList.push(animalId);
    }

    public addAnimalIdToCollection(animalId: Types.ObjectId): void {
        this.addAnimalIdToList(this.collectionAnimalIds, animalId);
    }

    public addAnimalIdToCrew(animalId: Types.ObjectId): void {
        this.addAnimalIdToList(this.crewAnimalIds, animalId);
    }

    private addAnimalIdsToListPositional(baseList: Types.ObjectId[], animalIds: Types.ObjectId[], position: number): void {
        this.modify();

        baseList.splice(position, 0, ...animalIds);
    }

    public addAnimalIdsToCollectionPositional(animalIds: Types.ObjectId[], position: number): void {
        this.addAnimalIdsToListPositional(this.collectionAnimalIds, animalIds, position);
    }

    public addAnimalIdsToCrewPositional(animalIds: Types.ObjectId[], position: number): void {
        this.addAnimalIdsToListPositional(this.crewAnimalIds, animalIds, position);
    }

    public removeAnimalIdFromList(baseList: Types.ObjectId[], animalId: Types.ObjectId): void {
        this.modify();

        const indexInBaseList = indexWhere(baseList, element => element.equals(animalId));

        if (indexInBaseList == -1) {
            return;
        }

        baseList.splice(indexInBaseList, 1);
    }

    public removeAnimalIdFromCollection(animalId: Types.ObjectId): void {
        this.removeAnimalIdFromList(this.collectionAnimalIds, animalId);
    }

    public removeAnimalIdFromCrew(animalId: Types.ObjectId): void {
        this.removeAnimalIdFromList(this.crewAnimalIds, animalId);
    }

    public removeAnimalIdsFromListPositional(baseList: Types.ObjectId[], positions: number[]): Types.ObjectId[] {
        this.modify();

        const animalIds: Types.ObjectId[] = [];
        positions.forEach(currentPosition => {
            animalIds.push(baseList[currentPosition]);
        });

        animalIds.forEach(currentAnimalId => {
            this.removeAnimalIdFromList(baseList, currentAnimalId);
        });

        return animalIds;
    }

    public removeAnimalIdsFromCollectionPositional(positions: number[]): Types.ObjectId[] {
        return this.removeAnimalIdsFromListPositional(this.collectionAnimalIds, positions);
    }

    public removeAnimalIdsFromCrewPositional(positions: number[]): Types.ObjectId[] {
        return this.removeAnimalIdsFromListPositional(this.crewAnimalIds, positions);
    }

    private applyCaptureReset(): void {
        if (this.hasCaptureReset) {
            this.freeCapturesLeft = 1;
            this.lastCaptureReset = new Date();
        }
    }

    public captureAnimal(): void {
        if (!this.hasCaptures) {
            throw new Error("A player's capture stats were updated as if they captured an animal without any remaining captures.");
        }

        if (this.collectionFull) {
            throw new Error("A player's capture stats were updated as if they captured an animal when their collection was full. ");
        }

        this.freeCapturesLeft -= 1;
        this.totalCaptures += 1;
    }

    private applyEncounterReset(): void {
        if (this.hasEncounterReset) {
            this.freeEncountersLeft = 5;
            this.lastEncounterReset = new Date();
        }
    }

    public encounterAnimal(): void {
        if (!this.hasEncounters) {
            throw new Error("A player's encounter stats were updated as if it encountered an animal without any remaining encounters.");
        }

        this.freeEncountersLeft -= 1;
        this.totalEncounters += 1;
    }
}

const playerSchema = new Schema({
    [Player.fieldNames.userId]: {
        type: String,
        required: true
    },
    [Player.fieldNames.guildId]: {
        type: String,
        required: true
    },
    [Player.fieldNames.collectionAnimalIds]: {
        type: [Schema.Types.ObjectId],
        required: true
    },
    [Player.fieldNames.collectionSizeLimit]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.crewAnimalIds]: {
        type: [Schema.Types.ObjectId],
        required: false
    },
    [Player.fieldNames.freeCapturesLeft]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.lastCaptureReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.totalCaptures]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.freeEncountersLeft]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.lastEncounterReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.totalEncounters]: {
        type: Number,
        required: true
    }
});

export const PlayerModel = mongoose.model("Player", playerSchema);