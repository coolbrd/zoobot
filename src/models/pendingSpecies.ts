import mongoose from 'mongoose';

import { schemaToUserInputBundle } from '../utility/toolbox';
import { speciesFieldInfo } from './species';

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

// Combine the Mongoose schema and the input info for the species model into a UserInputBundle
export const pendingSpeciesUserInputBundle = schemaToUserInputBundle(pendingSpeciesSchema, {
    commonNames: speciesFieldInfo.commonNames,
    scientificName: speciesFieldInfo.scientificName,
    images: speciesFieldInfo.images,
    description: speciesFieldInfo.description,
    naturalHabitat: speciesFieldInfo.naturalHabitat,
    wikiPage: speciesFieldInfo.wikiPage
});