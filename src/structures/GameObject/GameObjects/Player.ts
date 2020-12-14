import { stripIndent } from "common-tags";
import { GuildMember, TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import gameConfig from "../../../config/gameConfig";
import getGuildMember from "../../../discordUtility/getGuildMember";
import GameObject from "../GameObject";
import LoadableOwnedAnimal from "./LoadableGameObject/LoadableGameObjects/LoadableOwnedAnimal";
import { Animal } from "./Animal";
import { PlayerModel, playerSchemaDefinition } from '../../../models/Player';
import LoadableCacheableGameObject from "./LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject";
import { Species } from "./Species";
import BeastiaryClient from "../../../bot/BeastiaryClient";
import GameObjectListField from "../GameObjectListField";
import LoadableGameObject from "./LoadableGameObject/LoadableGameObject";

interface PlayerSpeciesRecord {
    speciesId: Types.ObjectId,
    data: {
        captures: number,
        essence: number
    }
}

export class Player extends GameObject {
    public readonly model = PlayerModel;
    public readonly schemaDefinition = playerSchemaDefinition;

    public static readonly fieldNames = {
        userId: "userId",
        guildId: "guildId",
        pep: "pep",
        lifetimePep: "lifetimePep",
        collectionUpgradeLevel: "collectionUpgradeLevel",
        collectionAnimalIds: "collectionAnimalIds",
        crewAnimalIds: "crewAnimalIds",
        lastDailyCurrencyReset: "lastDailyCurrencyReset",
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
        totalXpBoosts: "totalXpBoosts",
        tokenSpeciesIds: "tokenSpeciesIds",
        rarestTierCaught: "rarestTierCaught",
        favoriteAnimalId: "favoriteAnimalId",
        speciesRecords: "speciesRecords"
    };

    public static newDocument(guildMember: GuildMember): Document {
        return new PlayerModel({
            [Player.fieldNames.userId]: guildMember.user.id,
            [Player.fieldNames.guildId]: guildMember.guild.id,
            [Player.fieldNames.pep]: 0,
            [Player.fieldNames.lifetimePep]: 0,
            [Player.fieldNames.lastDailyCurrencyReset]: new Date(0),
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
            [Player.fieldNames.totalXpBoosts]: 0,
            [Player.fieldNames.rarestTierCaught]: 0
        });
    }

    private _member: GuildMember | undefined;
    private _animals: Animal[] | undefined;

    public readonly collectionAnimalIds: GameObjectListField<Types.ObjectId>;
    public readonly crewAnimalIds: GameObjectListField<Types.ObjectId>;
    public readonly tokenSpeciesIds: GameObjectListField<Types.ObjectId>;
    public readonly speciesRecords: GameObjectListField<PlayerSpeciesRecord>;

    constructor(document: Document, beastiaryClient: BeastiaryClient) {
        super(document, beastiaryClient);

        this.collectionAnimalIds = new GameObjectListField(this, this.document.get(Player.fieldNames.collectionAnimalIds));
        this.crewAnimalIds = new GameObjectListField(this, this.document.get(Player.fieldNames.crewAnimalIds));
        this.tokenSpeciesIds = new GameObjectListField(this, this.document.get(Player.fieldNames.tokenSpeciesIds));
        this.speciesRecords = new GameObjectListField(this, this.document.get(Player.fieldNames.speciesRecords));
    }

    public get member(): GuildMember {
        if (!this._member) {
            throw new Error(stripIndent`
                A player object's member field was attempted to be accessed before it was loaded.

                Player: ${this.debugString}
            `);
        }

        return this._member;
    }

    public get animals(): Animal[] {
        if (this._animals === undefined) {
            throw new Error(stripIndent`
                A player object's animals field was attempted to be accessed before it was loaded.

                Player: ${this.debugString}
            `);
        }

        return this._animals;
    }

    public get userId(): string {
        return this.document.get(Player.fieldNames.userId);
    }

    public get guildId(): string {
        return this.document.get(Player.fieldNames.guildId);
    }

    public get pep(): number {
        return this.document.get(Player.fieldNames.pep);
    }

    public set pep(pep: number) {
        const addedPep = pep - this.pep;

        if (addedPep > 0) {
            this.lifetimePep += addedPep;
        }

        this.setDocumentField(Player.fieldNames.pep, pep);
    }

    public get lifetimePep(): number {
        return this.document.get(Player.fieldNames.lifetimePep);
    }

    public set lifetimePep(lifetimePep: number) {
        this.setDocumentField(Player.fieldNames.lifetimePep, lifetimePep);
    }

    public get collectionUpgradeLevel(): number {
        return this.document.get(Player.fieldNames.collectionUpgradeLevel);
    }

    public set collectionUpgradeLevel(collectionUpgradeLevel: number) {
        this.setDocumentField(Player.fieldNames.collectionUpgradeLevel, collectionUpgradeLevel);
    }

    public get lastDailyCurrencyReset(): Date {
        return this.document.get(Player.fieldNames.lastDailyCurrencyReset);
    }

    public set lastDailyCurrencyReset(lastDailyCurrencyReset: Date) {
        this.setDocumentField(Player.fieldNames.lastDailyCurrencyReset, lastDailyCurrencyReset);
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

    private get freeEncountersLeftNoReset(): number {
        return this.document.get(Player.fieldNames.freeEncountersLeft);
    }

    public get freeEncountersLeft(): number {
        this.applyEncounterReset();

        return this.freeEncountersLeftNoReset;
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

    private get freeXpBoostsLeftNoReset(): number {
        return this.document.get(Player.fieldNames.freeXpBoostsLeft);
    }

    public get freeXpBoostsLeft(): number {
        this.applyXpBoostReset();

        return this.freeXpBoostsLeftNoReset;
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

    public get rarestTierCaught(): number {
        return this.document.get(Player.fieldNames.rarestTierCaught);
    }

    public set rarestTierCaught(rarestTierCaught: number) {
        this.setDocumentField(Player.fieldNames.rarestTierCaught, rarestTierCaught);
    }

    public get favoriteAnimalId(): Types.ObjectId | undefined {
        return this.document.get(Player.fieldNames.favoriteAnimalId);
    }

    public set favoriteAnimalId(favoriteAnimalId: Types.ObjectId | undefined) {
        this.setDocumentField(Player.fieldNames.favoriteAnimalId, favoriteAnimalId);
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
        return this.collectionAnimalIds.list.length >= this.collectionSizeLimit;
    }

    public get crewFull(): boolean {
        return this.crewAnimalIds.list.length >= gameConfig.maxCrewSize;
    }

    public get hasDailyCurrencyReset(): boolean {
        return this.lastDailyCurrencyReset.valueOf() < this.beastiaryClient.beastiary.resets.lastDailyCurrencyReset.valueOf();
    }

    public get hasCaptureReset(): boolean {
        return this.lastCaptureReset.valueOf() < this.beastiaryClient.beastiary.resets.lastCaptureReset.valueOf();
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

    public get periodsSinceLastEncounterReset(): number {
        return this.beastiaryClient.beastiary.resets.getPeriodsSinceLastReset(this.lastEncounterReset, this.beastiaryClient.beastiary.resets.lastEncounterReset, gameConfig.freeEncounterPeriod);
    }

    public get hasEncounterReset(): boolean {
        return this.periodsSinceLastEncounterReset > 0;
    }

    public get xpBoostsLeft(): number {
        return this.freeXpBoostsLeft + this.extraXpBoostsLeft;
    }

    public get hasXpBoost(): boolean {
        return this.xpBoostsLeft > 0;
    }

    public get periodsSinceLastXpBoostReset(): number {
        return this.beastiaryClient.beastiary.resets.getPeriodsSinceLastReset(this.lastXpBoostReset, this.beastiaryClient.beastiary.resets.lastXpBoostReset, gameConfig.freeXpBoostPeriod);
    }

    public get hasXpBoostReset(): boolean {
        return this.periodsSinceLastXpBoostReset > 0;
    }

    public get beastiaryPercentComplete(): number {
        const allSpeciesLength = this.beastiaryClient.beastiary.species.allSpeciesIds.length;
        const recordedSpeciesLength = this.speciesRecords.list.length;

        const recordedRatio = recordedSpeciesLength / allSpeciesLength * 100;

        return recordedRatio;
    }

    public hasToken(speciesId: Types.ObjectId): boolean {
        return this.tokenSpeciesIds.list.includes(speciesId);
    }

    public hasSpecies(speciesId: Types.ObjectId): boolean {
        const animalOfSpecies = this.animals.find(animal => animal.species.id.equals(speciesId));

        return Boolean(animalOfSpecies);
    }

    private idToLoadableAnimal(animalId: Types.ObjectId): LoadableOwnedAnimal {
        return new LoadableOwnedAnimal(animalId, this);
    }

    public getCollectionAsLoadableAnimals(): LoadableOwnedAnimal[] {
        return this.collectionAnimalIds.list.map(animalId => {
            return this.idToLoadableAnimal(animalId);
        });
    }

    public getCrewAsLoadableAnimals(): LoadableOwnedAnimal[] {
        return this.crewAnimalIds.list.map(animalId => {
            return this.idToLoadableAnimal(animalId);
        });
    }

    public getTokenLoadableSpecies(): LoadableCacheableGameObject<Species>[] {
        const speciesIdToLoadableSpecies = (speciesId: Types.ObjectId) => new LoadableCacheableGameObject<Species>(speciesId, this.beastiaryClient.beastiary.species);
        
        return this.tokenSpeciesIds.getAs(speciesIdToLoadableSpecies);
    }

    public addAnimalToCollection(animal: Animal): void {
        this.animals.push(animal);

        this.collectionAnimalIds.push(animal.id);
    }

    public giveToken(species: Species): void {
        if (this.hasToken(species.id)) {
            throw new Error(stripIndent`
                Attempted to give a player a token they already owned.

                Player: ${this.debugString}
                Species id: ${species.id}
            `);
        }

        this.tokenSpeciesIds.push(species.id);
    }

    public removeAnimalFromCollection(animal: Animal): void {
        this.animals.splice(this.animals.indexOf(animal), 1);

        this.collectionAnimalIds.remove(animal.id);
    }

    public claimDailyCurrency(): void {
        if (!this.hasDailyCurrencyReset) {
            throw new Error(stripIndent`
                A player somehow attempted to claim daily currency when they didn't have a reset available.

                Player: ${this.debugString}
            `);
        }

        this.lastDailyCurrencyReset = new Date();
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

    private applyPotentialNewRarestTierCaught(tier: number): void {
        if (tier > this.rarestTierCaught) {
            this.rarestTierCaught = tier;
        }
    }

    public captureAnimal(animal: Animal, channel: TextChannel): void {
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

        this.addAnimalToCollection(animal);

        this.applyPotentialNewRarestTierCaught(animal.species.rarityData.tier);

        this.awardCrewExperienceInChannel(gameConfig.xpPerCapture, channel);

        this.captureSpecies(animal.species.id);

        this.decrementCapturesLeft();
        this.totalCaptures += 1;
    }

    private applyEncounterReset(): void {
        const freePeriodsPassed = this.periodsSinceLastEncounterReset;

        if (freePeriodsPassed > 0) {
            const encountersToAdd = freePeriodsPassed * gameConfig.freeEncountersPerPeriod;

            this.freeEncountersLeft = Math.min(this.freeEncountersLeftNoReset + encountersToAdd, gameConfig.freeEncounterMaxStack);

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
        const freePeriodsPassed = this.periodsSinceLastXpBoostReset;
        
        if (freePeriodsPassed > 0) {
            const xpBoostsToAdd = freePeriodsPassed * gameConfig.freeXpBoostsPerPeriod;

            this.freeXpBoostsLeft = Math.min(this.freeXpBoostsLeftNoReset + xpBoostsToAdd, gameConfig.freeXpBoostMaxStack);

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

        this.totalXpBoosts += 1;

        this.decrementXpBoostsLeft();
    }

    public async fetchAnimalById(animalId: Types.ObjectId): Promise<Animal | undefined> {
        if (!this.collectionAnimalIds.list.includes(animalId)) {
            throw new Error(stripIndent`
                An animal id was attempted to be fetched from a player that didn't own an animal with the given id.

                Id: ${animalId}
                Player: ${this.debugString}
            `);
        }

        let animal: Animal | undefined;
        try {
            animal = await this.beastiaryClient.beastiary.animals.fetchById(animalId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal by its id in a player's fetch method.

                Player: ${this.debugString}

                ${error}
            `);
        }

        if (!animal) {
            this.collectionAnimalIds.remove(animalId);
            this.crewAnimalIds.remove(animalId);
        }

        return animal;
    }

    public async awardCrewExperienceInChannel(experienceAmount: number, channel: TextChannel): Promise<void> {
        const awardPromises: Promise<void>[] = [];

        this.crewAnimalIds.list.forEach(animalId => {
            const fetchPromise = this.beastiaryClient.beastiary.animals.fetchById(animalId).then(animal => {
                if (!animal) {
                    return;
                }

                animal.addExperienceInChannel(experienceAmount, channel);
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error fetching a player's crew animal by its id.

                    Player: ${this.debugString}
                    Crew animal id: ${animalId}

                    ${error}
                `);
            });

            awardPromises.push(fetchPromise);
        });

        await Promise.all(awardPromises);
    }

    public async releaseAnimal(animalId: Types.ObjectId): Promise<void> {
        let releasedAnimal: Animal | undefined;
        try {
            releasedAnimal = await this.fetchAnimalById(animalId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an animal by its id in the animal mananger.

                Id: ${animalId}
                Player: ${this.debugString}
                
                ${error}
            `);
        }

        if (!releasedAnimal) {
            return;
        }

        this.removeAnimalFromCollection(releasedAnimal);
        this.crewAnimalIds.remove(releasedAnimal.id);

        if (this.favoriteAnimalId) {
            if (this.favoriteAnimalId.equals(releasedAnimal.id)) {
                this.favoriteAnimalId = undefined;
            }
        }

        if (!releasedAnimal.playerIsOwner(this)) {
            throw new Error(stripIndent`
                A player somehow attempted to release an animal that doesn't belong to them.

                Player: ${this.debugString}
                Animal: ${releasedAnimal.debugString}
            `);
        }

        this.pep += releasedAnimal.value;
        this.addEssence(releasedAnimal.speciesId, releasedAnimal.level * 2);
    }

    private createNewSpeciesRecord(id: Types.ObjectId): PlayerSpeciesRecord {
        const newRecord: PlayerSpeciesRecord = {
            speciesId: id,
            data: {
                captures: 0,
                essence: 0
            }
        };

        return newRecord;
    }

    private addSpeciesRecord(record: PlayerSpeciesRecord): void {
        this.speciesRecords.push(record);
    }

    private createAndAddNewSpeciesRecord(id: Types.ObjectId): PlayerSpeciesRecord {
        const newRecord = this.createNewSpeciesRecord(id);

        this.addSpeciesRecord(newRecord);

        return newRecord;
    }

    private findSpeciesRecord(speciesId: Types.ObjectId): PlayerSpeciesRecord | undefined {
        return this.speciesRecords.list.find(speciesRecord => speciesRecord.speciesId.equals(speciesId));
    }

    private getOrInitializeSpeciesRecord(speciesId: Types.ObjectId): PlayerSpeciesRecord {
        let speciesRecord = this.findSpeciesRecord(speciesId);

        if (!speciesRecord) {
            speciesRecord = this.createAndAddNewSpeciesRecord(speciesId);
        }

        return speciesRecord;
    }

    private addCapture(speciesId: Types.ObjectId): void {
        this.modify();

        const speciesRecord = this.getOrInitializeSpeciesRecord(speciesId);

        speciesRecord.data.captures++;
    }

    public addEssence(speciesId: Types.ObjectId, essence: number): void {
        const speciesRecord = this.getOrInitializeSpeciesRecord(speciesId);

        speciesRecord.data.essence += essence;
    }

    public captureSpecies(speciesId: Types.ObjectId): void {
        this.addCapture(speciesId);

        this.addEssence(speciesId, 5);
    }

    public getSpeciesRecord(speciesId: Types.ObjectId): PlayerSpeciesRecord {
        const speciesRecord = this.findSpeciesRecord(speciesId);

        if (speciesRecord) {
            return speciesRecord;
        }
        else {
            return this.createNewSpeciesRecord(speciesId);
        }
    }

    public getRecordedLoadableSpecies(): LoadableGameObject<Species>[] {
        return this.speciesRecords.list.map(speciesRecord => {
            return new LoadableCacheableGameObject<Species>(speciesRecord.speciesId, this.beastiaryClient.beastiary.species);
        });
    }

    public getEssence(speciesId: Types.ObjectId): number {
        const record = this.getSpeciesRecord(speciesId);

        return record.data.essence;
    }

    private async loadGuildMember(): Promise<void> {
        try {
            this._member = await getGuildMember(this.userId, this.guildId, this.beastiaryClient);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading a player object's guild member.

                Player: ${this.debugString}
            `);
        }

        if (!this._member) {
            throw new Error(stripIndent`
                A player object's guild member couldn't be found.

                Player: ${this.debugString}
            `);
        }
    }

    private async loadAnimals(): Promise<void> {
        const loadedAnimals: Animal[] = [];

        const animalLoadPromises: Promise<void>[] = [];

        this.collectionAnimalIds.list.forEach(animalId => {
            const animalPromise = this.beastiaryClient.beastiary.animals.fetchById(animalId).then(animal => {
                if (!animal) {
                    throw new Error(stripIndent`
                        An invalid animal id was found in a player's collection.

                        Player: ${this.debugString}
                        Animal id: ${animalId}
                    `);
                }

                loadedAnimals.push(animal);
            });

            animalLoadPromises.push(animalPromise);
        });

        await Promise.all(animalLoadPromises);

        this._animals = loadedAnimals;
    }

    public async loadFields(): Promise<void> {
        const returnPromises: Promise<unknown>[] = [];
        returnPromises.push(super.loadFields());

        returnPromises.push(this.loadGuildMember());

        returnPromises.push(this.loadAnimals());

        await Promise.all(returnPromises);
    }
}