import mongoose, { Schema, Types } from "mongoose";
import GameObject from "../structures/GameObject";
import { indexWhere } from "../utility/arraysAndSuch";
import getWeightedRandom from "../utility/getWeightedRandom";

const cardSubSchema = new Schema({
    url: {
        type: String,
        required: true
    },
    rarity: {
        type: Number,
        required: true
    },
    breed: {
        type: String,
        required: false
    },
    special: {
        type: String,
        required: false
    }
});

const speciesSchema = new Schema({
    commonNames: [{
        name: {
            type: String,
            required: true
        },
        article: {
            type: String,
            required: true
        }
    }],
    commonNamesLower: {
        type: Array,
        required: true
    },
    scientificName: {
        type: String,
        required: true
    },
    cards: {
        type: [cardSubSchema],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    naturalHabitat: {
        type: String,
        required: true
    },
    wikiPage: {
        type: String,
        required: true
    },
    rarity: {
        type: Number,
        required: true
    }
});

export const SpeciesModel = mongoose.model("Species", speciesSchema);

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
export function commonNamesToLower(commonNames: CommonNameTemplate[]): string[] {
    // The array that will contain lowercase forms of all the common names
    const commonNamesLower: string[] = [];
    // Add each name's lowercase form to the list
    commonNames.forEach(commonName => {
        commonNamesLower.push((commonName["name"] as string).toLowerCase());
    });

    return commonNamesLower;
}

// The object representation of a species
export class Species extends GameObject {
    public readonly model = SpeciesModel;

    public get commonNameObjects(): CommonName[] {
        return this.document.get("commonNames");
    }

    public setCommonNameObjects(commonNameObjects: CommonNameTemplate[]): void {
        this.modify();

        this.document.set("commonNames", commonNameObjects);

        this.document.set("commonNamesLower", commonNamesToLower(commonNameObjects));
    }

    public get scientificName(): string {
        return this.document.get("scientificName");
    }

    public set scientificName(scientificName: string) {
        this.setField("scientificName", scientificName);
    }

    public get cards(): SpeciesCard[] {
        return this.document.get("cards");
    }

    public setCards(cards: SpeciesCardTemplate[]): void {
        this.setField("cards", cards);
    }

    public get description(): string {
        return this.document.get("description");
    }

    public set description(description: string) {
        this.setField("description", description);
    }

    public get naturalHabitat(): string {
        return this.document.get("naturalHabitat");
    }

    public set naturalHabitat(naturalHabitat: string) {
        this.setField("naturalHabitat", naturalHabitat);
    }

    public get wikiPage(): string {
        return this.document.get("wikiPage");
    }

    public set wikiPage(wikiPage: string) {
        this.setField("wikiPage", wikiPage);
    }

    public get rarity(): number {
        return this.document.get("rarity");
    }

    public set rarity(rarity: number) {
        this.setField("rarity", rarity);
    }

    // Gets a simple array of this species' common names
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

    // Gets the rarity table of this species' cards
    private get cardRarityTable(): Map<SpeciesCard, number> {
        const cardRarity = new Map<SpeciesCard, number>();

        this.cards.forEach(currentCard => {
            cardRarity.set(currentCard, currentCard.rarity);
        });

        return cardRarity;
    }

    // Get a random card from the weighted rarity map of cards
    public getRandomCard(): SpeciesCard {
        return getWeightedRandom(this.cardRarityTable);
    }

    // Determines and returns the index of a given card id within this species
    public indexOfCard(cardId: Types.ObjectId): number {
        return indexWhere(this.cards, card => card._id.equals(cardId));
    }
}