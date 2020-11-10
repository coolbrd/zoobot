import { stripIndents } from "common-tags";
import { GuildMember } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";
import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import gameConfig from "../config/gameConfig";
import getGuildMember from "../discordUtility/getGuildMember";
import GameObject from "../structures/GameObject";
import LoadableOwnedAnimal from "../structures/LoadableGameObject/LoadableGameObjects/LoadableOwnedAnimal";
import { indexWhere } from "../utility/arraysAndSuch";
import { Animal } from "./Animal";

export class Player extends GameObject {
    public readonly model = PlayerModel;

    public static readonly fieldNames = {
        userId: "userId",
        guildId: "guildId",
        scraps: "scraps",
        collectionUpgradeLevel: "collectionUpgradeLevel",
        collectionAnimalIds: "collectionAnimalIds",
        crewAnimalIds: "crewAnimalIds",
        freeCapturesLeft: "freeCapturesLeft",
        extraCapturesLeft: "extraCapturesLeft",
        lastCaptureReset: "lastCaptureReset",
        totalCaptures: "totalCaptures",
        freeEncountersLeft: "freeEncountersLeft",
        extraEncountersLeft: "extraEncountersLeft",
        lastEncounterReset: "lastEncounterReset",
        totalEncounters: "totalEncounters"
    };

    public static newDocument(guildMember: GuildMember): Document {
        return new PlayerModel({
            [Player.fieldNames.userId]: guildMember.user.id,
            [Player.fieldNames.guildId]: guildMember.guild.id,
            [Player.fieldNames.scraps]: 0,
            [Player.fieldNames.collectionUpgradeLevel]: 0,
            [Player.fieldNames.freeCapturesLeft]: 0,
            [Player.fieldNames.extraCapturesLeft]: 0,
            [Player.fieldNames.lastCaptureReset]: new Date(0),
            [Player.fieldNames.totalCaptures]: 0,
            [Player.fieldNames.freeEncountersLeft]: 0,
            [Player.fieldNames.extraEncountersLeft]: 0,
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

    public get scraps(): number {
        return this.document.get(Player.fieldNames.scraps);
    }

    public set scraps(scraps: number) {
        this.setDocumentField(Player.fieldNames.scraps, scraps);
    }

    public get collectionUpgradeLevel(): number {
        return this.document.get(Player.fieldNames.collectionUpgradeLevel);
    }

    public set collectionUpgradeLevel(collectionUpgradeLevel: number) {
        this.setDocumentField(Player.fieldNames.collectionUpgradeLevel, collectionUpgradeLevel);
    }

    public get collectionAnimalIds(): Types.ObjectId[] {
        return this.document.get(Player.fieldNames.collectionAnimalIds);
    }

    public get crewAnimalIds(): Types.ObjectId[] {
        return this.document.get(Player.fieldNames.crewAnimalIds);
    }

    public get freeCapturesLeft(): number {
        this.applyCaptureReset();

        return this.document.get(Player.fieldNames.freeCapturesLeft);
    }

    public set freeCapturesLeft(freeCapturesLeft: number) {
        this.setDocumentField(Player.fieldNames.freeCapturesLeft, freeCapturesLeft);
    }

    public get extraCapturesLeft(): number {
        return this.document.get(Player.fieldNames.extraCapturesLeft);
    }

    public set extraCapturesLeft(extraCapturesLeft: number) {
        this.setDocumentField(Player.fieldNames.extraCapturesLeft, extraCapturesLeft);
    }

    public get lastCaptureReset(): Date {
        return this.document.get(Player.fieldNames.lastCaptureReset);
    }

    public set lastCaptureReset(lastCaptureReset: Date) {
        this.setDocumentField(Player.fieldNames.lastCaptureReset, lastCaptureReset);
    }

    public get totalCaptures(): number {
        return this.document.get(Player.fieldNames.totalCaptures);
    }

    public set totalCaptures(totalCaptures: number) {
        this.setDocumentField(Player.fieldNames.totalCaptures, totalCaptures);
    }

    public get freeEncountersLeft(): number {
        this.applyEncounterReset();

        return this.document.get(Player.fieldNames.freeEncountersLeft);
    }

    public set freeEncountersLeft(freeEncountersLeft: number) {
        this.setDocumentField(Player.fieldNames.freeEncountersLeft, freeEncountersLeft);
    }

    public get extraEncountersLeft(): number {
        return this.document.get(Player.fieldNames.extraEncountersLeft);
    }

    public set extraEncountersLeft(extraEncountersLeft: number) {
        this.setDocumentField(Player.fieldNames.extraEncountersLeft, extraEncountersLeft);
    }

    public get lastEncounterReset(): Date {
        return this.document.get(Player.fieldNames.lastEncounterReset);
    }

    public set lastEncounterReset(lastEncounterReset: Date) {
        this.setDocumentField(Player.fieldNames.lastEncounterReset, lastEncounterReset);
    }

    public get totalEncounters(): number {
        return this.document.get(Player.fieldNames.totalEncounters);
    }

    public set totalEncounters(totalEncounters: number) {
        this.setDocumentField(Player.fieldNames.totalEncounters, totalEncounters);
    }

    public get collectionSizeLimit(): number {
        return 5;
    }

    public get capturesLeft(): number {
        return this.freeCapturesLeft + this.extraCapturesLeft;
    }

    public get hasCaptures(): boolean {
        return this.capturesLeft > 0;
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

    public get encountersLeft(): number {
        return this.freeEncountersLeft + this.extraEncountersLeft;
    }

    public get hasEncounters(): boolean {
        return this.encountersLeft > 0;
    }

    public get hasEncounterReset(): boolean {
        return this.lastEncounterReset.valueOf() < encounterHandler.lastEncounterReset.valueOf();
    }

    private animalIdsToLoadableAnimals(animalIds: Types.ObjectId[]): LoadableOwnedAnimal[] {
        const loadableAnimals: LoadableOwnedAnimal[] = [];

        animalIds.forEach(currentAnimalId => {
            const newLoadableAnimal = new LoadableOwnedAnimal(currentAnimalId, this);

            loadableAnimals.push(newLoadableAnimal);
        });

        return loadableAnimals;
    }

    public getCollectionAsLoadableAnimals(): LoadableOwnedAnimal[] {
        return this.animalIdsToLoadableAnimals(this.collectionAnimalIds);
    }

    public getCrewAsLoadableAnimals(): LoadableOwnedAnimal[] {
        return this.animalIdsToLoadableAnimals(this.crewAnimalIds);
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
            this.freeCapturesLeft = gameConfig.freeCapturesPerPeriod;
            this.lastCaptureReset = new Date();
        }
    }

    public decrementCapturesLeft(): void {
        if (this.freeCapturesLeft > 0) {
            this.freeCapturesLeft -= 1;
        }
        else if (this.extraCapturesLeft > 0) {
            this.extraCapturesLeft -= 1;
        }
        else {
            throw new Error("A player's captures were decremented when the player had none left.");
        }
    }

    public captureAnimal(): void {
        if (!this.hasCaptures) {
            throw new Error("A player's capture stats were updated as if they captured an animal without any remaining captures.");
        }

        if (this.collectionFull) {
            throw new Error("A player's capture stats were updated as if they captured an animal when their collection was full. ");
        }

        this.decrementCapturesLeft();
        this.totalCaptures += 1;
    }

    private applyEncounterReset(): void {
        if (this.hasEncounterReset) {
            this.freeEncountersLeft = gameConfig.freeEncountersPerPeriod;
            this.lastEncounterReset = new Date();
        }
    }

    public decrementEncountersLeft(): void {
        if (this.freeEncountersLeft > 0) {
            this.freeEncountersLeft -= 1;
        }
        else if (this.extraEncountersLeft > 0) {
            this.extraEncountersLeft -= 1;
        }
        else {
            throw new Error("A player's encounters were decremented when the player had none left.");
        }
    }

    public encounterAnimal(): void {
        if (!this.hasEncounters) {
            throw new Error("A player's encounter stats were updated as if it encountered an animal without any remaining encounters.");
        }

        this.decrementEncountersLeft();
        this.totalEncounters += 1;
    }

    public async fetchAnimalById(id: Types.ObjectId): Promise<Animal | undefined> {
        if (!this.collectionAnimalIds.includes(id)) {
            throw new Error(stripIndents`
                An animal id was attempted to be fetched from a player that didn't own an animal with the given id.
                Id: ${id}
                Player: ${this}
            `);
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.fetchById(id);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching an animal by its id in a player's fetch method.
                Player: ${this}
                Error: ${error}
            `);
        }

        if (!animal) {
            this.removeAnimalIdFromCollection(id);
            this.removeAnimalIdFromCrew(id);
        }

        return animal;
    }

    public async awardCrewExperience(experienceAmount: number): Promise<void> {
        const crewAnimals: Animal[] = [];
        try {
            await new Promise(resolve => {
                let completed = 0;
                for (const currentCrewAnimalId of this.crewAnimalIds) {
                    this.fetchAnimalById(currentCrewAnimalId).then(animal => {
                        if (!animal) {
                            return;
                        }

                        crewAnimals.push(animal);

                        if (++completed >= this.crewAnimalIds.length) {
                            resolve();
                        }
                    }).catch(error => {
                        throw new Error(`There was an error fetching a player's crew animal by its id: ${error}`);
                    });
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error bulk fetching a player's crew animals: ${error}`);
        }

        for (const crewAnimal of crewAnimals) {
            crewAnimal.experience += experienceAmount;
        }
    }

    public async releaseAnimal(animalId: Types.ObjectId): Promise<void> {
        let animal: Animal | undefined;
        try {
            animal = await this.fetchAnimalById(animalId);
        }
        catch (error) {
            throw new Error(`There was an error fetching an animal by its id in the animal mananger: ${error}`);
        }

        if (!animal) {
            return;
        }

        this.removeAnimalIdFromCollection(animal.id);
        this.removeAnimalIdFromCrew(animal.id);

        this.scraps += animal.value;

        try {
            await beastiary.animals.removeFromCache(animal.id);
        }
        catch (error) {
            throw new Error(`There was an error removing a deleted animal from the cache: ${error}`);
        }

        try {
            await animal.delete();
        }
        catch (error) {
            throw new Error(`There was an error deleting an animal object: ${error}`);
        }
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
    [Player.fieldNames.scraps]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.collectionUpgradeLevel]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.collectionAnimalIds]: {
        type: [Schema.Types.ObjectId],
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
    [Player.fieldNames.extraCapturesLeft]: {
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
    [Player.fieldNames.extraEncountersLeft]: {
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