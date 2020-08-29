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
    family: {
        type: String,
        required: true
    }
});

export interface SpeciesDocument {
    commonNames: string[],
    scientificName: string,
    images: string[],
    description: string,
    naturalHabitat: string,
    wikiPage: string,
    family: string
}

export default mongoose.model('Species', speciesSchema);