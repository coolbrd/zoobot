import mongoose from 'mongoose';

import { UserInputBundle } from './userInput';

const Schema = mongoose.Schema;

// The actual required fields of a species in the submission process
export const pendingSpeciesFields: UserInputBundle = {
    commonNames: {
        type: Array,
        required: true,
        prompt: `common name`,
        info: `Enter the animal's common name (e.g. "dog")`
    },
    images: {
        type: Array,
        required: true,
        prompt: `image`,
        info: `Enter a direct imgur link to a clear image of the animal`
    },
    scientificName: {
        type: String,
        required: true,
        prompt: `scientific name`,
        info: `Enter the animal's scientific (taxonomical) name`
    },
    description: {
        type: String,
        required: false,
        prompt: `description`,
        info: `Enter a short description of the animal`
    },
    naturalHabitat: {
        type: String,
        required: false,
        prompt: `natural habitat`,
        info: `Enter a brief overview of the animal's natural habitat (see other animals for examples)`
    },
    wikiPage: {
        type: String,
        required: false,
        prompt: `Wikipedia page`,
        info: `Enter the link for the animal's species' Wikipedia page`
    }
};

// Turn the user input bundle into a Mongoose schema
// It needs to be converted to unknown first in order to cast it into a SchemaDefinition. Mongoose doesn't naturally trust my types but believe me it'll work.
// I don't know if Mongoose does anything with the superfluous prompt and info fields, but so far they seem to just be ignored, and that's a good thing
const pendingSpeciesSchema = new Schema(pendingSpeciesFields);

export const PendingSpecies = mongoose.model(`PendingSpecies`, pendingSpeciesSchema);