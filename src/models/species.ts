import mongoose, { Schema, Document, Types } from 'mongoose';
import DocumentWrapper from '../structures/documentWrapper';

export const imageSubSchema = new Schema({
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
    commonNames: {
        type: Array,
        required: true
    },
    commonNamesLower: {
        type: Array,
        required: true
    },
    scientificName: {
        type: String,
        required: true
    },
    images: {
        type: [imageSubSchema],
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

export const Species = mongoose.model('Species', speciesSchema);

// An object representing the subschema that's found within the array of images in a species document
export class ImageSubObject {
    private document: Document;

    constructor(imageDocument: Document) {
        this.document = imageDocument;
    }

    public getId(): Types.ObjectId {
        return this.document._id;
    }

    public getUrl(): string {
        return this.document.get('url');
    }

    public getBreed(): string | undefined {
        return this.document.get('breed');
    }
}

// A simple, stripped-down object used for easier interfacing with species documents returned from Mongoose queries
export class SpeciesObject extends DocumentWrapper {
    private images: ImageSubObject[] | undefined;

    public getCommonNames(): string[] {
        return this.getDocument().get('commonNames');
    }

    public getScientificName(): string {
        return this.getDocument().get('scientificName');
    }

    public getDescription(): string {
        return this.getDocument().get('description');
    }

    public getNaturalHabitat(): string {
        return this.getDocument().get('naturalHabitat');
    }

    public getWikiPage(): string {
        return this.getDocument().get('wikiPage');
    }

    public getRarity(): number {
        return this.getDocument().get('rarity');
    }

    public getImages(): ImageSubObject[] {
        if (!this.images) {
            throw new Error('Tried to get a species\'s images before they were loaded.');
        }

        return this.images;
    }

    public imagesLoaded(): boolean {
        return Boolean(this.images);
    }

    public fullyLoaded(): boolean {
        return super.fullyLoaded() && this.imagesLoaded();
    }

    // Loads this species' document
    public async loadDocument(): Promise<void> {
        // If the species' document is already known/loaded, do nothing
        if (this.documentLoaded()) {
            return;
        }

        // Find the species document and set it
        const speciesDocument = await Species.findById(this.getId());
        if (!speciesDocument) {
            throw new Error('No species document was found for an id given to a species object.');
        }
        this.setDocument(speciesDocument);
    }

    // Loads this species' image objects
    public loadImages(): void {
        if (!this.documentLoaded()) {
            throw new Error('A species\' images were attempted to be loaded before its document was.');
        }

        // If this species' images are already known/loaded, do nothing
        if (this.imagesLoaded()) {
            return;
        }

        // Get this species' images and add each of them as an object
        const imageSubObjects: ImageSubObject[] = [];
        this.getDocument().get('images').forEach((imageDocument: Document) => {
            imageSubObjects.push(new ImageSubObject(imageDocument));
        });
        this.images = imageSubObjects;
    }

    // Loads this species' data from the database
    public async load(): Promise<void> {
        // Don't load again if it's already loaded
        if (this.fullyLoaded()) {
            return;
        }

        // Don't finish/resolve this function until the document and images are loaded
        await this.loadDocument();
        this.loadImages();
    }

    // Unloads this species' data
    public unload(): void {
        super.unload();
        this.images = undefined;
    }
}