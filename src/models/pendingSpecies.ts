import mongoose from 'mongoose';
import { schemaToUserInputBundle } from '../utility/toolbox';

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

export const PendingSpecies = mongoose.model(`PendingSpecies`, pendingSpeciesSchema);

// Combine the Mongoose schema and some input prompts into a complete UserInputBundle for later input retrieval
export const pendingSpeciesUserInputBundle = schemaToUserInputBundle(pendingSpeciesSchema, {
    commonNames: {
        prompt: `common name`,
        info: `Enter the animal's common name (e.g. "dog")`
    },
    images: {
        prompt: `image`,
        info: `Enter a direct imgur link to a clear image of the animal`
    },
    scientificName: {
        prompt: `scientific name`,
        info: `Enter the animal's scientific (taxonomical) name`
    },
    description: {
        prompt: `description`,
        info: `Enter a short description of the animal`
    },
    naturalHabitat: {
        prompt: `natural habitat`,
        info: `Enter a brief overview of the animal's natural habitat (see other animals for examples)`
    },
    wikiPage: {
        prompt: `Wikipedia page`,
        info: `Enter the link for the animal's species' Wikipedia page`
    }
});