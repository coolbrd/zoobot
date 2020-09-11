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
    public readonly _id: Types.ObjectId;
    public readonly url: string;
    public readonly breed: string | undefined;

    constructor(imageDocument: Document) {
        this._id = imageDocument._id;
        this.url = imageDocument.get('url');
        this.breed = imageDocument.get('breed') || undefined;
    }
}

// A simple, stripped-down object used for easier interfacing with species documents returned from Mongoose queries
// Not to be used if the species document needs to be changed (yet)
export class SpeciesObject {
    public readonly _id: Types.ObjectId;
    public readonly commonNames: string[];
    public readonly scientificName: string;
    public readonly images: ImageSubObject[];
    public readonly description: string;
    public readonly naturalHabitat: string;
    public readonly wikiPage: string;
    public readonly rarity: number;

    constructor(speciesDocument: Document) {
        this._id = speciesDocument._id;
        this.commonNames = speciesDocument.get('commonNames');
        this.scientificName = speciesDocument.get('scientificName');
        this.images = [];
        speciesDocument.get('images').forEach((imageDocument: Document) => {
            this.images.push(new ImageSubObject(imageDocument));
        });
        this.description = speciesDocument.get('description');
        this.naturalHabitat = speciesDocument.get('naturalHabitat');
        this.wikiPage = speciesDocument.get('wikiPage');
        this.rarity = speciesDocument.get('rarity');
    }
}