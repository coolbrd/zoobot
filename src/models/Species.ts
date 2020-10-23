import mongoose, { Schema, Document, Types } from "mongoose";
import GameObject from "../structures/GameObject";
import getWeightedRandom from "../utility/getWeightedRandom";

export const cardSubSchema = new Schema({
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

export const speciesSchema = new Schema({
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

export interface SpeciesCardField extends SpeciesCardTemplate {
    _id: Types.ObjectId;
}

// An object representing a card within a species
export class SpeciesCard {
    private _document: Document;
    private _species: Species;

    constructor(cardDocument: Document, speciesObject: Species) {
        this._document = cardDocument;
        this._species = speciesObject;
    }

    public get document(): Document {
        return this._document;
    }

    private get species(): Species {
        return this._species;
    }

    public get id(): Types.ObjectId {
        return this.document._id;
    }

    public get url(): string {
        return this.document.get("url");
    }

    public get rarity(): number {
        return this.document.get("rarity");
    }

    public get breed(): string | undefined {
        return this.document.get("breed");
    }

    public get special(): string | undefined {
        return this.document.get("special");
    }

    // Gets this card's index in its parent species' list of cards
    public get index(): number {
        const index = this.species.cardObjects.findIndex(card => {
            return this.id.equals(card._id)
        });
        
        if (index === undefined) {
            throw new Error("A species card with no place in its species was found.");
        }
        return index;
    }
}

// Template for a common name object
export interface CommonNameTemplate {
    _id?: Types.ObjectId,
    name: string,
    article: string
}

// A common name object that exists in the database
export interface CommonNameField extends CommonNameTemplate {
    _id: Types.ObjectId
}

// The template for a species' set of fields, used for updating fields
export interface SpeciesFieldsTemplate {
    commonNames?: CommonNameTemplate[],
    scientificName?: string,
    cards?: SpeciesCardTemplate[],
    description?: string,
    naturalHabitat?: string,
    wikiPage?: string,
    rarity?: number
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

    // The species' list of cards
    private _cards: SpeciesCard[] | undefined;

    // The map of the species' cards and their respective rarity values
    private cardRarity = new Map<SpeciesCard, number>();

    public get commonNameObjects(): CommonNameField[] {
        return this.document.get("commonNames");
    }

    public get scientificName(): string {
        return this.document.get("scientificName");
    }

    public get cardObjects(): SpeciesCardField[] {
        return this.document.get("cards");
    }

    public get description(): string {
        return this.document.get("description");
    }

    public get naturalHabitat(): string {
        return this.document.get("naturalHabitat");
    }

    public get wikiPage(): string {
        return this.document.get("wikiPage");
    }

    public get rarity(): number {
        return this.document.get("rarity");
    }

    // Get a random card from the weighted rarity map
    public getRandomCard(): SpeciesCard {
        if (this.cardRarity.size < 1) {
            throw new Error("Tried to get a species' random card before its cards were loaded.");
        }

        return getWeightedRandom(this.cardRarity);
    }

    // Changes the fields of the species document and commits them to the database
    public async setFields(fields: SpeciesFieldsTemplate): Promise<void> {
        // Change the species' simple fields, using this object's default known value for unchanged fields
        try {
            await this.document.updateOne({
                $set: {
                    commonNames: fields.commonNames || this.commonNameObjects,
                    commonNamesLower: commonNamesToLower(fields.commonNames || this.commonNameObjects),
                    scientificName: fields.scientificName || this.scientificName,
                    cards: fields.cards || this.cardObjects,
                    description: fields.description || this.description,
                    naturalHabitat: fields.naturalHabitat || this.naturalHabitat,
                    wikiPage: fields.wikiPage || this.wikiPage,
                    rarity: fields.rarity || this.rarity
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error updating a species' fields: ${error}`);
        }

        // Refresh information again to reflect the changes that were just made
        try {
            await this.refresh();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a species' information after changing its fields: ${error}`);
        }
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

    public get cards(): SpeciesCard[] {
        if (!this._cards) {
            throw new Error("Tried to get a species's cards before they were loaded.");
        }

        return this._cards;
    }

    public get cardCount(): number {
        return this.cards.length;
    }

    public cardsLoaded(): boolean {
        return Boolean(this._cards);
    }

    // Loads this species' card objects
    public loadCards(): void {
        if (!this.documentLoaded) {
            throw new Error("A species' cards were attempted to be loaded before its document was.");
        }

        // If this species' cards are already known/loaded, do nothing
        if (this.cardsLoaded()) {
            return;
        }

        // Get this species' cards and add each of them as an object
        const cards: SpeciesCard[] = [];
        this.document.get("cards").forEach((cardDocument: Document) => {
            cards.push(new SpeciesCard(cardDocument, this));
        });
        this._cards = cards;
        
        // Build this species' rarity table
        for (const card of this.cards) {
            this.cardRarity.set(card, card.rarity);
        }
    }

    // Loads this species' data from the database
    public async load(): Promise<void> {
        try {
            await super.load();
        }
        catch (error) {
            throw new Error(`There was an error loading a species: ${error}`);
        }
        
        this.loadCards();
    }

    // Unloads this species' data
    public unload(): void {
        super.unload();
        this._cards = undefined;
    }
}