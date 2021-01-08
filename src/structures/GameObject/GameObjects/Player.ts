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
import ListField from "../GameObjectFieldHelpers/ListField";
import LoadableGameObject from "./LoadableGameObject/LoadableGameObject";
import { PlayerGuild } from "./PlayerGuild";
import premiumConfig from "../../../config/premiumConfig";
import CountedResetField from "../GameObjectFieldHelpers/CountedResetField";
import ResetField from "../GameObjectFieldHelpers/ResetField";
import { threadId } from "worker_threads";

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
        premium: "premium",
        playerGuildId: "playerGuildId",
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

    protected referenceNames = {
        playerGuild: "playerGuild"
    };

    public static newDocument(guildMember: GuildMember, playerGuild: PlayerGuild): Document {
        return new PlayerModel({
            [Player.fieldNames.userId]: guildMember.user.id,
            [Player.fieldNames.guildId]: guildMember.guild.id,
            [Player.fieldNames.premium]: false,
            [Player.fieldNames.playerGuildId]: playerGuild.id,
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

    public readonly collectionAnimalIds: ListField<Types.ObjectId>;
    public readonly crewAnimalIds: ListField<Types.ObjectId>;
    public readonly tokenSpeciesIds: ListField<Types.ObjectId>;
    public readonly speciesRecords: ListField<PlayerSpeciesRecord>;

    public readonly freeEncounters: CountedResetField;
    public readonly freeCaptures: CountedResetField;
    public readonly freeXpBoosts: CountedResetField;

    constructor(document: Document, beastiaryClient: BeastiaryClient) {
        super(document, beastiaryClient);

        this.references = {
            [this.referenceNames.playerGuild]: {
                cache: beastiaryClient.beastiary.playerGuilds,
                id: this.playerGuildId
            }
        };

        this.collectionAnimalIds = new ListField(this, Player.fieldNames.collectionAnimalIds, this.document.get(Player.fieldNames.collectionAnimalIds));
        this.crewAnimalIds = new ListField(this, Player.fieldNames.crewAnimalIds, this.document.get(Player.fieldNames.crewAnimalIds));
        this.tokenSpeciesIds = new ListField(this, Player.fieldNames.tokenSpeciesIds, this.document.get(Player.fieldNames.tokenSpeciesIds));
        this.speciesRecords = new ListField(this, Player.fieldNames.speciesRecords, this.document.get(Player.fieldNames.speciesRecords));

        this.freeEncounters = new CountedResetField({
            gameObject: this,
            countFieldName: Player.fieldNames.freeEncountersLeft,
            lastResetFieldName: Player.fieldNames.lastEncounterReset,
            basePeriod: gameConfig.freeEncounterPeriod,
            baseCountPerPeriod: gameConfig.freeEncountersPerPeriod,
            baseMaxStack: gameConfig.freeEncounterMaxStack,
            premiumPeriodModifier: premiumConfig.encounterPeriodMultiplier,
            premiumMaxStackModifier: premiumConfig.freeEncounterMaxStackMultiplier,
            getPremium: this.getPremium.bind(this)
        });

        this.freeCaptures = new CountedResetField({
            gameObject: this,
            countFieldName: Player.fieldNames.freeCapturesLeft,
            lastResetFieldName: Player.fieldNames.lastCaptureReset,
            basePeriod: gameConfig.freeCapturePeriod,
            baseCountPerPeriod: gameConfig.freeCapturesPerPeriod,
            baseMaxStack: 1,
            premiumPeriodModifier: premiumConfig.capturePeriodMultiplier,
            getPremium: this.getPremium.bind(this)
        });

        this.freeXpBoosts = new CountedResetField({
            gameObject: this,
            countFieldName: Player.fieldNames.freeXpBoostsLeft,
            lastResetFieldName: Player.fieldNames.lastXpBoostReset,
            basePeriod: gameConfig.freeXpBoostPeriod,
            baseCountPerPeriod: gameConfig.freeXpBoostsPerPeriod,
            baseMaxStack: gameConfig.freeXpBoostMaxStack,
            premiumPeriodModifier: premiumConfig.xpBoostPeriodMultiplier,
            getPremium: this.getPremium.bind(this)
        });
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

    public get playerGuild(): PlayerGuild {
        return this.getReference(this.referenceNames.playerGuild);
    }

    public get userId(): string {
        return this.document.get(Player.fieldNames.userId);
    }

    public get guildId(): string {
        return this.document.get(Player.fieldNames.guildId);
    }

    public get playerPremium(): boolean {
        return this.document.get(Player.fieldNames.premium);
    }

    public set playerPremium(premium: boolean) {
        this.setDocumentField(Player.fieldNames.premium, premium);
    }

    public get playerGuildId(): Types.ObjectId {
        return this.document.get(Player.fieldNames.playerGuildId);
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

    public get lastDailyPepReset(): Date {
        return this.document.get(Player.fieldNames.lastDailyCurrencyReset);
    }

    public set lastDailyPepReset(lastDailyPepReset: Date) {
        this.setDocumentField(Player.fieldNames.lastDailyCurrencyReset, lastDailyPepReset);
    }

    public get collectionUpgradeLevel(): number {
        return this.document.get(Player.fieldNames.collectionUpgradeLevel);
    }

    public set collectionUpgradeLevel(collectionUpgradeLevel: number) {
        this.setDocumentField(Player.fieldNames.collectionUpgradeLevel, collectionUpgradeLevel);
    }

    public get extraCapturesLeft(): number {
        return this.document.get(Player.fieldNames.extraCapturesLeft);
    }

    public set extraCapturesLeft(extraCapturesLeft: number) {
        this.setDocumentField(Player.fieldNames.extraCapturesLeft, extraCapturesLeft);
    }

    public get totalCaptures(): number {
        return this.document.get(Player.fieldNames.totalCaptures);
    }

    public set totalCaptures(totalCaptures: number) {
        this.setDocumentField(Player.fieldNames.totalCaptures, totalCaptures);
    }

    public get extraEncountersLeft(): number {
        return this.document.get(Player.fieldNames.extraEncountersLeft);
    }

    public set extraEncountersLeft(extraEncountersLeft: number) {
        this.setDocumentField(Player.fieldNames.extraEncountersLeft, extraEncountersLeft);
    }

    public get totalEncounters(): number {
        return this.document.get(Player.fieldNames.totalEncounters);
    }

    public set totalEncounters(totalEncounters: number) {
        this.setDocumentField(Player.fieldNames.totalEncounters, totalEncounters);
    }

    public get extraXpBoostsLeft(): number {
        return this.document.get(Player.fieldNames.extraXpBoostsLeft);
    }

    public set extraXpBoostsLeft(extraXpBoostsLeft: number) {
        this.setDocumentField(Player.fieldNames.extraXpBoostsLeft, extraXpBoostsLeft);
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
        return this.freeCaptures.count + this.extraCapturesLeft;
    }

    public get hasCaptures(): boolean {
        return this.capturesLeft > 0;
    }

    public get collectionFull(): boolean {
        return this.collectionAnimalIds.list.length >= this.collectionSizeLimit;
    }

    public get maxCrewSize(): number {
        let maxCrewSize = gameConfig.maxCrewSize;

        if (this.getPremium()) {
            maxCrewSize *= premiumConfig.crewSizeMultiplier;
        }

        return maxCrewSize;
    }

    public get crewFull(): boolean {
        return this.crewAnimalIds.list.length >= this.maxCrewSize;
    }

    public get canCapture(): boolean {
        return this.hasCaptures && !this.collectionFull && !this.beastiaryClient.beastiary.encounters.playerIsCapturing(this);
    }

    public get encountersLeft(): number {
        return this.freeEncounters.count + this.extraEncountersLeft;
    }

    public get xpBoostsLeft(): number {
        return this.freeXpBoosts.count + this.extraXpBoostsLeft;
    }

    public get totalRecordedSpecies(): number {
        return this.speciesRecords.list.length;
    }

    public get beastiaryPercentComplete(): number {
        const allSpeciesLength = this.beastiaryClient.beastiary.species.allSpeciesIds.length;
        const recordedSpeciesCount = this.totalRecordedSpecies;
        const recordedRatio = recordedSpeciesCount / allSpeciesLength * 100;

        return recordedRatio;
    }

    public get totalCollectionValue(): number {
        let total = 0;

        this.animals.forEach(animal => total += animal.value);

        return total;
    }

    public get hasDailyPepReset(): boolean {
        const now = new Date();

        const hasReset = this.lastDailyPepReset.getDate() !== now.getDate() || this.lastDailyPepReset.getMonth() !== now.getMonth() || this.lastDailyPepReset.getFullYear() !== now.getFullYear();

        return hasReset;
    }

    public getPremium(): boolean {
        return this.playerPremium || this.playerGuild.premium;
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
        return this.tokenSpeciesIds.list.map(speciesIdToLoadableSpecies);
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
        this.crewAnimalIds.remove(animal.id);

        if (this.favoriteAnimalId) {
            if (this.favoriteAnimalId.equals(animal.id)) {
                this.favoriteAnimalId = undefined;
            }
        }
    }

    private applyDailyPepReset(): void {
        this.lastDailyPepReset = new Date();
    }

    public claimDailyPep(): void {
        if (!this.hasDailyPepReset) {
            throw new Error(stripIndent`
                A player somehow attempted to claim daily currency when they didn't have a reset available.

                Player: ${this.debugString}
            `);
        }

        this.applyDailyPepReset();
    }

    public decrementCapturesLeft(): void {
        if (this.freeCaptures.count > 0) {
            this.freeCaptures.count -= 1;
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

        animal.changeOwner(this.id);
        this.addAnimalToCollection(animal);
        this.applyPotentialNewRarestTierCaught(animal.species.rarityData.tier);
        this.awardCrewExperienceInChannel(gameConfig.xpPerCapture, channel);
        this.captureSpecies(animal.species.id);
        this.decrementCapturesLeft();
        this.totalCaptures += 1;
    }

    public decrementEncountersLeft(): void {
        if (this.freeEncounters.count > 0) {
            this.freeEncounters.count -= 1;
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
        if (this.encountersLeft <= 0) {
            throw new Error(stripIndent`
                A player's encounter stats were updated as if it encountered an animal without any remaining encounters.

                Player: ${this.debugString}
            `);
        }

        this.decrementEncountersLeft();
        this.totalEncounters += 1;
    }

    public decrementXpBoostsLeft(): void {
        if (this.freeXpBoosts.count > 0) {
            this.freeXpBoosts.count -= 1;
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
        if (this.xpBoostsLeft <= 0) {
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

    public async giveAnimal(animalId: Types.ObjectId, receivingPlayer: Player): Promise<void> {
        let ownedAnimal: Animal | undefined;
        
        try {
            ownedAnimal = await this.fetchAnimalById(animalId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player's owned animal before giving it to another player.

                Animal id: ${animalId}
                Player: ${this.debugString}

                ${error}
            `);
        }

        if (!ownedAnimal) {
            throw new Error(stripIndent`
                An animal id that a player does not own was attempted to be given to another player.

                Animal id: ${animalId}
                Player: ${this.debugString}
            `);
        }

        this.removeAnimalFromCollection(ownedAnimal);

        try {
            await ownedAnimal.changeOwner(receivingPlayer.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error changing the owner of an animal being given to another player.

                Animal id: ${animalId}
                Giving player: ${this.debugString}
                Receiving player: ${receivingPlayer.debugString}

                ${error}
            `);
        }

        receivingPlayer.addAnimalToCollection(ownedAnimal);
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
        const speciesRecord = this.getOrInitializeSpeciesRecord(speciesId);
        speciesRecord.data.captures++;
        this.speciesRecords.modify();
    }

    public addEssence(speciesId: Types.ObjectId, essence: number): void {
        const speciesRecord = this.getOrInitializeSpeciesRecord(speciesId);
        speciesRecord.data.essence += essence;
        this.speciesRecords.modify();
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

    public getHighestEssenceSpeciesRecord(): PlayerSpeciesRecord | undefined {
        const firstEssenceRecord = this.speciesRecords.getPosition(0);

        if (!firstEssenceRecord) {
            return undefined;
        }

        let highestEssenceRecord = firstEssenceRecord;

        this.speciesRecords.list.forEach(record => {
            if (record.data.essence > highestEssenceRecord.data.essence) {
                highestEssenceRecord = record;
            }
        });

        return highestEssenceRecord;
    }

    public getSpeciesLevelCap(speciesId: Types.ObjectId): number {
        const essence = this.getEssence(speciesId);
        let extraLevelCap = Math.max(0, essence - 9);
        extraLevelCap = Math.floor(extraLevelCap / 7);

        return extraLevelCap + 5;
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

    public async applyPotentialPremium(): Promise<void> {
        let hasPremium: boolean;
        try {
            hasPremium = await this.beastiaryClient.beastiary.playerGuilds.hasPremium(this.userId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error checking is a player has premium.

                Player: ${this.debugString}

                ${error}
            `);
        }

        this.playerPremium = hasPremium;

        if (!this.getPremium()) {
            this.crewAnimalIds.splice(2, 2);
        }
    }

    public async loadFields(): Promise<void> {
        const returnPromises: Promise<unknown>[] = [];

        returnPromises.push(super.loadFields());
        returnPromises.push(this.loadGuildMember());
        returnPromises.push(this.loadAnimals());

        await Promise.all(returnPromises);

        await this.applyPotentialPremium();
    }
}