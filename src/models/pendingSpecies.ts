import mongoose from 'mongoose';

// The schema for a pending species submission
const pendingSpeciesSchema = new mongoose.Schema({
    commonNames: {
        type: Array,
        required: true,
    },
    images: {
        type: Array,
        required: true,
    },
    scientificName: {
        type: String,
        required: true,
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