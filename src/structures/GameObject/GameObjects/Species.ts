import { Types } from "mongoose";
import GameObject from "../GameObject";
import { indexWhere } from "../../../utility/arraysAndSuch";
import { getWeightedRandom } from "../../../utility/weightedRarity";
import { SpeciesModel } from '../../../models/Species';
import { beastiary } from "../../../beastiary/Beastiary";

export class Species extends GameObject {
    public readonly model = SpeciesModel;

    public static readonly fieldNames = {
        commonNames: "commonNames",
        commonNamesLower: "commonNamesLower",
        scientificName: "scientificName",
        cards: "cards",
        description: "description",
        naturalHabitat: "naturalHabitat",
        wikiPage: "wikiPage",
        rarity: "rarity",
        token: "token"
    };

    public get commonNameObjects(): CommonName[] {
        return this.document.get(Species.fieldNames.commonNames);
    }

    public setCommonNameObjects(commonNameObjects: CommonNameTemplate[]): void {
        this.modify();

        this.document.set(Species.fieldNames.commonNames, commonNameObjects);

        this.document.set(Species.fieldNames.commonNamesLower, commonNamesToLowerArray(commonNameObjects));
    }

    public get commonNamesLower(): string[] {
        return this.document.get(Species.fieldNames.commonNamesLower);
    }

    public get scientificName(): string {
        return this.document.get(Species.fieldNames.scientificName);
    }

    public set scientificName(scientificName: string) {
        this.setDocumentField(Species.fieldNames.scientificName, scientificName);
    }

    public get cards(): SpeciesCard[] {
        return this.document.get(Species.fieldNames.cards);
    }

    public setCards(cards: SpeciesCardTemplate[]): void {
        this.setDocumentField(Species.fieldNames.cards, cards);
    }

    public get description(): string {
        return this.document.get(Species.fieldNames.description);
    }

    public set description(description: string) {
        this.setDocumentField(Species.fieldNames.description, description);
    }

    public get naturalHabitat(): string | undefined {
        return this.document.get(Species.fieldNames.naturalHabitat);
    }

    public set naturalHabitat(naturalHabitat: string | undefined) {
        this.setDocumentField(Species.fieldNames.naturalHabitat, naturalHabitat);
    }

    public get wikiPage(): string {
        return this.document.get(Species.fieldNames.wikiPage);
    }

    public set wikiPage(wikiPage: string) {
        this.setDocumentField(Species.fieldNames.wikiPage, wikiPage);
    }

    public get rarity(): number {
        return this.document.get(Species.fieldNames.rarity);
    }

    public set rarity(rarity: number) {
        this.setDocumentField(Species.fieldNames.rarity, rarity);
    }

    public get token(): string {
        return this.document.get(Species.fieldNames.token);
    }

    public set token(token: string) {
        this.setDocumentField(Species.fieldNames.token, token);
    }

    public get baseValue(): number {
        const rarityInfo = beastiary.encounters.getRarityInfo(this.rarity);

        const baseValue = 2 + Math.floor(Math.pow(1.75, rarityInfo.tier + 1));

        return baseValue;
    }

    public get commonNames(): string[] {
        const commonNameObjects = this.commonNameObjects;

        const commonNames: string[] = [];
        commonNameObjects.forEach(commonNameObject => {
            commonNames.push(commonNameObject.name);
        });

        return commonNames;
    }

    public get cardCount(): number {
        return this.cards.length;
    }

    protected get cardRarityTable(): Map<SpeciesCard, number> {
        const cardRarity = new Map<SpeciesCard, number>();

        this.cards.forEach(currentCard => {
            cardRarity.set(currentCard, currentCard.rarity);
        });

        return cardRarity;
    }

    public getRandomCard(): SpeciesCard {
        return getWeightedRandom(this.cardRarityTable);
    }

    public indexOfCard(cardId: Types.ObjectId): number {
        return indexWhere(this.cards, card => card._id.equals(cardId));
    }
}

export interface SpeciesCardTemplate {
    _id?: Types.ObjectId,
    url: string,
    rarity: number,
    breed?: string,
    special?: string
}

export interface SpeciesCard extends SpeciesCardTemplate {
    _id: Types.ObjectId
}

export interface CommonNameTemplate {
    _id?: Types.ObjectId,
    name: string,
    article: string
}

export interface CommonName extends CommonNameTemplate {
    _id: Types.ObjectId
}

// Converts a set of common name objects to a list of lowercase common names
export function commonNamesToLowerArray(commonNames: CommonNameTemplate[]): string[] {
    const commonNamesLower: string[] = [];

    commonNames.forEach(commonName => {
        commonNamesLower.push((commonName.name).toLowerCase());
    });

    return commonNamesLower;
}