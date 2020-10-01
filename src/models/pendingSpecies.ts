import mongoose, { Schema } from 'mongoose';

// The schema for a pending species submission
export const pendingSpeciesSchema = new Schema({
    commonNames: {
        type: [String],
        required: true,
    },
    commonNamesLower: {
        type: [String],
        required: true
    },
    scientificName: {
        type: String,
        required: true,
    },
    images: {
        type: [String],
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