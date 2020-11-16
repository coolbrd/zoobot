import { stripIndent } from "common-tags";
import { GuildMember, TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import { beastiary } from "../../../beastiary/Beastiary";
import gameConfig from "../../../config/gameConfig";
import getGuildMember from "../../../discordUtility/getGuildMember";
import GameObject from "../GameObject";
import LoadableOwnedAnimal from "./LoadableGameObject/LoadableGameObjects/LoadableOwnedAnimal";
import { indexWhere } from "../../../utility/arraysAndSuch";
import { Animal } from "./Animal";
import { PlayerModel } from '../../../models/Player';

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
        totalEncounters: "totalEncounters",
        freeXpBoostsLeft: "freeXpBoostsLeft",
        extraXpBoostsLeft: "extraXpBoostsLeft",
        lastXpBoostReset: "lastXpBoostReset",
        totalXpBoosts: "totalXpBoosts"
    };

    public readonly fieldRestrictions = {
        [Player.fieldNames.scraps]: {
            nonNegative: true
        },
        [Player.fieldNames.collectionUpgradeLevel]: {
            nonNegative: true
        },
        [Player.fieldNames.freeCapturesLeft]: {
            nonNegative: true
        },
        [Player.fieldNames.extraCapturesLeft]: {
            nonNegative: true
        },
        [Player.fieldNames.totalCaptures]: {
            nonNegative: true
        },
        [Player.fieldNames.freeEncountersLeft]: {
            nonNegative: true
        },
        [Player.fieldNames.extraEncountersLeft]: {
            nonNegative: true
        },
        [Player.fieldNames.totalEncounters]: {
            nonNegative: true
        },
        [Player.fieldNames.freeXpBoostsLeft]: {
            nonNegative: true
        },
        [Player.fieldNames.extraXpBoostsLeft]: {
            nonNegative: true
        },
        [Player.fieldNames.totalXpBoosts]: {
            nonNegative: true
        }
    }

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
            [Player.fieldNames.totalEncounters]: 0,
            [Player.fieldNames.freeXpBoostsLeft]: 0,
            [Player.fieldNames.extraXpBoostsLeft]: 0,
            [Player.fieldNames.lastXpBoostReset]: new Date(0),
            [Player.fieldNames.totalXpBoosts]: 0
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

    public get freeXpBoostsLeft(): number {
        this.applyXpBoostReset();

        return this.document.get(Player.fieldNames.freeXpBoostsLeft);
    }

    public set freeXpBoostsLeft(freeXpBoostsLeft: number) {
        this.setDocumentField(Player.fieldNames.freeXpBoostsLeft, freeXpBoostsLeft);
    }

    public get extraXpBoostsLeft(): number {
        return this.document.get(Player.fieldNames.extraXpBoostsLeft);
    }

    public set extraXpBoostsLeft(extraXpBoostsLeft: number) {
        this.setDocumentField(Player.fieldNames.extraXpBoostsLeft, extraXpBoostsLeft);
    }

    public get lastXpBoostReset(): Date {
        return this.document.get(Player.fieldNames.lastXpBoostReset);
    }

    public set lastXpBoostReset(lastXpBoostReset: Date) {
        this.setDocumentField(Player.fieldNames.lastXpBoostReset, lastXpBoostReset);
    }

    public get totalXpBoosts(): number {
        return this.document.get(Player.fieldNames.totalXpBoosts);
    }

    public set totalXpBoosts(totalXpBoosts: number) {
        this.setDocumentField(Player.fieldNames.totalXpBoosts, totalXpBoosts);
    }

    public get collectionSizeLimit(): number {
        return (this.collectionUpgradeLevel + 1) * 5;
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

    public get crewFull(): boolean {
        return this.crewAnimalIds.length >= gameConfig.maxCrewSize;
    }

    public get hasCaptureReset(): boolean {
        return this.lastCaptureReset.valueOf() < beastiary.resets.lastCaptureReset.valueOf();
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
        return this.lastEncounterReset.valueOf() < beastiary.resets.lastEncounterReset.valueOf();
    }

    public get xpBoostsLeft(): number {
        return this.freeXpBoostsLeft + this.extraXpBoostsLeft;
    }

    public get hasXpBoost(): boolean {
        return this.xpBoostsLeft > 0;
    }

    public get hasXpBoostReset(): boolean {
        return this.lastXpBoostReset.valueOf() < beastiary.resets.lastXpBoostReset.valueOf();
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
            throw new Error(stripIndent`
                A player's captures were decremented when the player had none left.

                Player: ${this.debugString}
            `);
        }
    }

    public captureAnimal(): void {
        if (!this.hasCaptures) {
            throw new Error(stripIndent`
                A player's capture stats were updated as if they captured an animal without any remaining captures.

                Player: ${this.debugString}
            `);
        }

        if (this.collectionFull) {
            throw new Error(stripIndent`
                A player's capture stats were updated as if they captured an animal when their collection was full.

                Player: ${this.debugString}
            `);
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
            throw new Error(stripIndent`
                A player's encounters were decremented when the player had none left.

                Player: ${this.debugString}
            `);
        }
    }

    public encounterAnimal(): void {
        if (!this.hasEncounters) {
            throw new Error(stripIndent`
                A player's encounter stats were updated as if it encountered an animal without any remaining encounters.

                Player: ${this.debugString}
            `);
        }

        this.decrementEncountersLeft();
        this.totalEncounters += 1;
    }

    public applyXpBoostReset(): void {
        if (this.hasXpBoostReset) {
            this.freeXpBoostsLeft = gameConfig.xpBoostsPerPeriod;
            this.lastXpBoostReset = new Date();
        }
    }

    public decrementXpBoostsLeft(): void {
        if (this.freeXpBoostsLeft > 0) {
            this.freeXpBoostsLeft -= 1;
        }
        else if (this.extraXpBoostsLeft > 0) {
            this.extraXpBoostsLeft -= 1;
        }
        else {
            throw new Error(stripIndent`
                A player's xp boosts were decremented when the player had none left.

                Player: ${this.debugString}
            `);
        }
    }

    public useXpBoost(): void {
        if (!this.hasXpBoost) {
            throw new Error(stripIndent`
                A player's xp boost stats were updated as if they used an xp boost without having any.

                Player: ${this.debugString}
            `);
        }

        this.decrementXpBoostsLeft();
    }

    public async fetchAnimalById(id: Types.ObjectId): Promise<Animal | undefined> {
        if (!this.collectionAnimalIds.includes(id)) {
            throw new Error(stripIndent`
                An animal id was attempted to be fetched from a player that didn't own an animal with the given id.

                Id: ${id}
                Player: ${this.debugString}
            `);
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.fetchById(id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal by its id in a player's fetch method.

                Player: ${this.debugString}

                ${error}
            `);
        }

        if (!animal) {
            this.removeAnimalIdFromCollection(id);
            this.removeAnimalIdFromCrew(id);
        }

        return animal;
    }

    public async awardCrewExperienceInChannel(experienceAmount: number, channel: TextChannel): Promise<void> {
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
                        throw new Error(stripIndent`
                            There was an error fetching a player's crew animal by its id.

                            Id: ${currentCrewAnimalId}
                            Player: ${this.debugString}
                            
                            ${error}
                        `);
                    });
                }
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error bulk fetching a player's crew animals.

                Player: ${this.debugString}
                
                ${error}
            `);
        }

        for (const crewAnimal of crewAnimals) {
            crewAnimal.addExperienceInChannel(experienceAmount, channel);
        }
    }

    public async releaseAnimal(animalId: Types.ObjectId): Promise<void> {
        let animal: Animal | undefined;
        try {
            animal = await this.fetchAnimalById(animalId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal by its id in the animal mananger.

                Id: ${animalId}
                Player: ${this.debugString}
                
                ${error}
            `);
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
            throw new Error(stripIndent`
                There was an error removing a deleted animal from the cache.

                Animal: ${animal.debugString}
                
                ${error}
            `);
        }

        try {
            await animal.delete();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error deleting an animal object.

                Animal: ${animal.debugString}
                
                ${error}
            `);
        }
    }
}
