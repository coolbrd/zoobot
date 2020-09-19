import mongoose, { Schema, Document, Types } from 'mongoose';

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
export class SpeciesObject {
    private readonly id: Types.ObjectId;

    private document: Document | undefined;

    private loaded = false;

    private images: ImageSubObject[] | undefined;

    constructor(speciesInfo: { speciesId?: Types.ObjectId, speciesDocument?: Document }) {
        // Use whichever piece of information has been provided
        if (speciesInfo.speciesId) {
            this.id = speciesInfo.speciesId;
        }
        else if (speciesInfo.speciesDocument) {
            this.id = speciesInfo.speciesDocument._id;
            this.document = speciesInfo.speciesDocument;
        }
        // If neither of the fields were satisfied
        else {
            throw new Error('Insufficient information provided for species object.');
        }
    }

    public getId(): Types.ObjectId {
        return this.getDocument().id;
    }

    // Loads this species's data from the database
    public async load(): Promise<void> {
        // Don't load again if it's already loaded
        if (this.isLoaded()) {
            return;
        }

        // Only load the species document if it hasn't been supplied already
        const speciesDocument = this.document || await Species.findById(this.id);

        if (!speciesDocument) {
            throw new Error('No species document was found for an id given to a species object.');
        }

        this.document = speciesDocument;

        const imageSubObjects: ImageSubObject[] = [];
        this.getDocument().get('images').forEach((imageDocument: Document) => {
            imageSubObjects.push(new ImageSubObject(imageDocument));
        });

        this.images = imageSubObjects;
    }

    public isLoaded(): boolean {
        return this.loaded;
    }

    private getDocument(): Document {
        if (!this.document) {
            throw new Error('A species object\'s document was attempted to be read before it was loaded.');
        }

        return this.document;
    }

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
}