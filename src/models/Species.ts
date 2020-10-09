import mongoose, { Schema, Document, Types } from "mongoose";

import DocumentWrapper from "../structures/DocumentWrapper";

export const cardSubSchema = new Schema({
    url: {
        type: String,
        required: true
    },
    breed: {
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
    breed?: string
}

export interface SpeciesCardField extends SpeciesCardTemplate {
    _id: Types.ObjectId;
}

// An object representing a card within a species
export class SpeciesCard {
    private document: Document;
    private species: Species;

    constructor(cardDocument: Document, speciesObject: Species) {
        this.document = cardDocument;
        this.species = speciesObject;
    }

    public getId(): Types.ObjectId {
        return this.document._id;
    }

    public getUrl(): string {
        return this.document.get("url");
    }

    public getBreed(): string | undefined {
        return this.document.get("breed");
    }

    // Gets this card's index in its parent species' list of cards
    public getIndex(): number {
        const index = this.species.getCardObjects().findIndex(card => {
            return this.getId().equals(card._id)
        });
        
        if (index === undefined) {
            throw new Error("A species card with no place in its species was found.");
        }
        return index;
    }
}

export interface CommonNameTemplate {
    _id?: Types.ObjectId,
    name: string,
    article: string
}

export interface CommonNameField extends CommonNameTemplate {
    _id: Types.ObjectId
}

export interface SpeciesFieldsTemplate {
    commonNames?: CommonNameTemplate[],
    scientificName?: string,
    cards?: SpeciesCardTemplate[],
    description?: string,
    naturalHabitat?: string,
    wikiPage?: string,
    rarity?: number
}

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
export class Species extends DocumentWrapper {
    // The species' list of cards
    private cards: SpeciesCard[] | undefined;

    constructor(documentId: Types.ObjectId) {
        super(SpeciesModel, documentId);
    }

    public getCommonNameObjects(): CommonNameField[] {
        return this.getDocument().get("commonNames");
    }

    public getScientificName(): string {
        return this.getDocument().get("scientificName");
    }

    public getCardObjects(): SpeciesCardField[] {
        return this.getDocument().get("cards");
    }

    public getDescription(): string {
        return this.getDocument().get("description");
    }

    public getNaturalHabitat(): string {
        return this.getDocument().get("naturalHabitat");
    }

    public getWikiPage(): string {
        return this.getDocument().get("wikiPage");
    }

    public getRarity(): number {
        return this.getDocument().get("rarity");
    }

    // Changes the fields of the species document and commits them to the database
    public async setFields(fields: SpeciesFieldsTemplate): Promise<void> {
        // Reload fields so default information is as current as possible
        await this.refresh();

        // Change the species' simple fields, using this object's default known value for unchanged fields
        try {
            await this.getDocument().updateOne({
                $set: {
                    commonNames: fields.commonNames || this.getCommonNameObjects(),
                    commonNamesLower: commonNamesToLower(fields.commonNames || this.getCommonNameObjects()),
                    scientificName: fields.scientificName || this.getScientificName(),
                    cards: fields.cards || this.getCardObjects(),
                    description: fields.description || this.getDescription(),
                    naturalHabitat: fields.naturalHabitat || this.getNaturalHabitat(),
                    wikiPage: fields.wikiPage || this.getWikiPage(),
                    rarity: fields.rarity || this.getRarity()
                }
            });
        }
        catch (error) {
            throw new Error(`There was an error updating a species' fields: ${error}`);
        }

        // Refresh information again to reflect the changes that were just made
        await this.refresh();
    }

    // Gets a simple array of this species' common names
    public getCommonNames(): string[] {
        const commonNameObjects = this.getCommonNameObjects();
        const commonNames: string[] = [];
        commonNameObjects.forEach(commonNameObject => {
            commonNames.push(commonNameObject.name);
        });
        return commonNames;
    }

    public getCards(): SpeciesCard[] {
        if (!this.cards) {
            throw new Error("Tried to get a species's cards before they were loaded.");
        }

        return this.cards;
    }

    public getCardCount(): number {
        return this.getCards().length;
    }

    public cardsLoaded(): boolean {
        return Boolean(this.cards);
    }

    // Loads this species' card objects
    public loadCards(): void {
        if (!this.documentLoaded()) {
            throw new Error("A species' cards were attempted to be loaded before its document was.");
        }

        // If this species' cards are already known/loaded, do nothing
        if (this.cardsLoaded()) {
            return;
        }

        // Get this species' cards and add each of them as an object
        const cards: SpeciesCard[] = [];
        this.getDocument().get("cards").forEach((cardDocument: Document) => {
            cards.push(new SpeciesCard(cardDocument, this));
        });
        this.cards = cards;
    }

    // Loads this species' data from the database
    public async load(): Promise<void> {
        await super.load();
        this.loadCards();
    }

    // Unloads this species' data
    public unload(): void {
        super.unload();
        this.cards = undefined;
    }
}