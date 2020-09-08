import mongoose, { Schema } from 'mongoose';

// The schema for a pending species submission
export const pendingSpeciesSchema = new Schema({
    commonNames: {
        type: Array,
        required: true,
    },
    commonNamesLower: {
        type: Array,
        required: true
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

export const PendingSpecies = mongoose.model('PendingSpecies', pendingSpeciesSchema);