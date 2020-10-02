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

export interface ImageFieldsTemplate {
    _id?: Types.ObjectId,
    url?: string,
    breed?: string
}

// An object representing the subschema that's found within the array of images in a species document
export class ImageSubObject {
    private document: Document;
    private speciesObject: SpeciesObject;

    constructor(imageDocument: Document, speciesObject: SpeciesObject) {
        this.document = imageDocument;
        this.speciesObject = speciesObject;
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

    public async setFields(fields: ImageFieldsTemplate): Promise<void> {
        await Species.updateOne({
            _id: this.speciesObject.getId(),
            'images._id': this.document._id
        }, {
            'images.$.url': fields.url || this.getUrl(),
            'images.$.breed': fields.breed || this.getBreed() || ''
        });
    }

    // Gets this image's index in its parent species' list of images
    public getIndex(): number {
        const index = this.speciesObject.getImageDocuments().findIndex(imageDocument => {
            return this.getId().equals(imageDocument._id)
        });
        if (index === undefined) {
            throw new Error('A species image with no place in its species was found.');
        }
        return index;
    }
}

export interface CommonNameFieldsTemplate {
    name: string,
    article: string
}

export interface SpeciesFieldsTemplate {
    commonNames?: CommonNameFieldsTemplate[],
    scientificName?: string,
    images?: ImageFieldsTemplate[],
    description?: string,
    naturalHabitat?: string,
    wikiPage?: string,
    rarity?: number
}

export function commonNamesToLower(commonNames: CommonNameFieldsTemplate[]): string[] {
    // The array that will contain lowercase forms of all the common names
    const commonNamesLower: string[] = [];
    // Add each name's lowercase form to the list
    commonNames.forEach(commonName => {
        commonNamesLower.push((commonName['name'] as string).toLowerCase());
    });

    return commonNamesLower;
}

// A simple, stripped-down object used for easier interfacing with species documents returned from Mongoose queries
export class SpeciesObject extends DocumentWrapper {
    private images: ImageSubObject[] | undefined;

    public getCommonNames(): CommonNameFieldsTemplate[] {
        return this.getDocument().get('commonNames');
    }

    public getScientificName(): string {
        return this.getDocument().get('scientificName');
    }

    public getImageDocuments(): Document[] {
        return this.getDocument().get('images');
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

    // Changes the fields of the species document and commits them to the database
    public async setFields(fields: SpeciesFieldsTemplate): Promise<void> {
        // Reload fields so default information is as current as possible
        await this.refresh();

        // Change the species' simple fields, using this object's default known value for unchanged fields
        await this.getDocument().updateOne({
            $set: {
                commonNames: fields.commonNames || this.getCommonNames(),
                commonNamesLower: commonNamesToLower(fields.commonNames || this.getCommonNames()),
                scientificName: fields.scientificName || this.getScientificName(),
                description: fields.description || this.getDescription(),
                naturalHabitat: fields.naturalHabitat || this.getNaturalHabitat(),
                wikiPage: fields.wikiPage || this.getWikiPage(),
                rarity: fields.rarity || this.getRarity()
            }
        });
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
            imageSubObjects.push(new ImageSubObject(imageDocument, this));
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