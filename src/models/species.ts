import mongoose, { Schema } from 'mongoose';

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

interface ImageSubObject {
    url: string,
    breed: string
}

export interface SpeciesObject {
    _id: Schema.Types.ObjectId,
    commonNames: string[],
    commonNamesLower: string[],
    scientificName: string,
    images: ImageSubObject[],
    description: string,
    naturalHabitat: string,
    wikiPage: string,
    rarity: number
}

export const Species = mongoose.model('Species', speciesSchema);