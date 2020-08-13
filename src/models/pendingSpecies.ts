import mongoose from 'mongoose';

const Schema = mongoose.Schema;

export const pendingSpeciesFields = {
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

const pendingSpeciesSchema = new Schema(pendingSpeciesFields);

export const PendingSpecies = mongoose.model(`PendingSpecies`, pendingSpeciesSchema);