import { GuildMember } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import GameObject from "../structures/GameObject";
import { indexWhere } from "../utility/arraysAndSuch";

const playerSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    collectionAnimalIds: {
        type: [Schema.Types.ObjectId],
        required: true
    },
    collectionSizeLimit: {
        type: Number,
        required: true
    },
    crewAnimalIds: {
        type: [Schema.Types.ObjectId],
        required: false
    },
    freeCapturesLeft: {
        type: Number,
        required: true
    },
    lastCaptureReset: {
        type: Schema.Types.Date,
        required: true
    },
    totalCaptures: {
        type: Number,
        required: true
    },
    freeEncountersLeft: {
        type: Number,
        required: true
    },
    lastEncounterReset: {
        type: Schema.Types.Date,
        required: true
    },
    totalEncounters: {
        type: Number,
        required: true
    }
});

export const PlayerModel = mongoose.model("Player", playerSchema);

// A player game object
export class Player extends GameObject {
    public readonly model = PlayerModel;

    public static newDocument(guildMember: GuildMember): Document {
        return new PlayerModel({
            userId: guildMember.user.id,
            guildId: guildMember.guild.id,
            collectionSizeLimit: 5,
            freeCapturesLeft: 0,
            lastCaptureReset: new Date(0),
            totalCaptures: 0,
            freeEncountersLeft: 0,
            lastEncounterReset: new Date(0),
            totalEncounters: 0
        });
    }

    // The player's associated Discord guild member object
    public readonly member: GuildMember;

    constructor(document: Document) {
        super(document);

        this.member = getGuildMember(this.userId, this.guildId);
    }

    public get userId(): string {
        return this.document.get("userId");
    }

    public get guildId(): string {
        return this.document.get("guildId");
    }

    public get collectionAnimalIds(): Types.ObjectId[] {
        return this.document.get("collectionAnimalIds");
    }

    public get collectionSizeLimit(): number {
        return this.document.get("collectionSizeLimit");
    }

    public get crewAnimalIds(): Types.ObjectId[] {
        return this.document.get("crewAnimalIds");
    }

    public get freeCapturesLeft(): number {
        this.applyCaptureReset();

        return this.document.get("freeCapturesLeft");
    }

    public set freeCapturesLeft(freeCapturesLeft: number) {
        this.setField("freeCapturesLeft", freeCapturesLeft);
    }

    public get lastCaptureReset(): Date {
        return this.document.get("lastCaptureReset");
    }

    public set lastCaptureReset(lastCaptureReset: Date) {
        this.setField("lastCaptureReset", lastCaptureReset);
    }

    public get totalCaptures(): number {
        return this.document.get("totalCaptures");
    }

    public set totalCaptures(totalCaptures: number) {
        this.setField("totalCaptures", totalCaptures);
    }

    public get freeEncountersLeft(): number {
        this.applyEncounterReset();

        return this.document.get("freeEncountersLeft");
    }

    public set freeEncountersLeft(freeEncountersLeft: number) {
        this.setField("freeEncountersLeft", freeEncountersLeft);
    }

    public get lastEncounterReset(): Date {
        return this.document.get("lastEncounterReset");
    }

    public set lastEncounterReset(lastEncounterReset: Date) {
        this.setField("lastEncounterReset", lastEncounterReset);
    }

    public get totalEncounters(): number {
        return this.document.get("totalEncounters");
    }

    public set totalEncounters(totalEncounters: number) {
        this.setField("totalEncounters", totalEncounters);
    }

    // Whether or not the player can capture an animal, due to any of the given restrictions
    public canCapture(): boolean {
        return this.freeCapturesLeft > 0 && this.collectionAnimalIds.length < this.collectionSizeLimit;
    }

    // Gets an animal id by its position in the player's collection
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

    // Adds a list of animal ids to a given list after a given position
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

    // Removes a set of animal ids from a list by a given set of positions and returns them
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

    // Checks if the player has been given their free capture during this capture period, and applies it if necessary
    private applyCaptureReset(): void {
        // If the player hasn't recieved their free capture reset during the current period
        if (this.lastCaptureReset.valueOf() < encounterHandler.lastCaptureReset.valueOf()) {
            this.freeCapturesLeft = 1;
            this.lastCaptureReset = new Date();
        }
    }

    // Called after a player captures an animal, and its stats needs to be updated
    public captureAnimal(): void {
        if (this.freeCapturesLeft <= 0) {
            throw new Error("A player's capture stats were updated as if they captured an animal without any remaining captures.");
        }

        if (this.collectionAnimalIds.length >= this.collectionSizeLimit) {
            throw new Error("A player's capture stats were updated as if they captured an animal when their collection was full. ");
        }

        this.freeCapturesLeft -= 1;
        this.totalCaptures += 1;
    }

    // Checks if the player has been given their free capture during this capture period, and applies it if necessary
    private applyEncounterReset(): void {
        // If the player hasn't received their free encounters during this period
        if (this.lastEncounterReset.valueOf() < encounterHandler.lastEncounterReset.valueOf()) {
            this.freeEncountersLeft = 5;
            this.lastEncounterReset = new Date();
        }
    }

    // Called when the player encounters an animal and their stats need to be updated
    public encounterAnimal(): void {
        if (this.freeEncountersLeft <= 0) {
            throw new Error("A player's encounter stats were updated as if it encountered an animal without any remaining encounters.");
        }

        this.freeEncountersLeft -= 1;
        this.totalEncounters += 1;
    }
}