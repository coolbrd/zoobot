import mongoose, { Schema } from 'mongoose';

// The schema for a pending species submission
export const pendingSpeciesSchema = new Schema({
    commonNames: {
        type: Array,
        required: true,
    },
    scientificName: {
        type: String,
        required: true,
    },
    images: {
        type: Array,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    naturalHabitat: {
        type: String,
        required: false,
    },
    wikiPage: {
        type: String,
        required: false,
    },
    author: {
        type: String,
        required: true
    }
});

export interface PendingSpeciesDocument {
    commonNames: string[],
    scientificName: string,
    images: string[],
    description: string,
    naturalHabitat: string,
    wikiPage: string,
    author: string
}

export const PendingSpecies = mongoose.model('PendingSpecies', pendingSpeciesSchema);