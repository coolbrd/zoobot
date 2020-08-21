import mongoose from 'mongoose';

import { FieldInfoBundle } from '../utility/userInput';

const Schema = mongoose.Schema;

const SpeciesSchema = new Schema({
    commonNames: {
        type: Array,
        required: true
    },
    scientificName: {
        type: String,
        required: true
    },
    images: {
        type: Array,
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

// Information pertaining to the fields of a species document
// Used to gather user input for these fields, and to properly display their information
export const speciesFieldInfo: FieldInfoBundle = {
    commonNames: {
        alias: `common name`,
        prompt: `the animal's common name (e.g. "dog")`,
        multiple: true,
        delimiter: `, `
    },
    scientificName: {
        alias: `scientific name`,
        prompt: `the animal's scientific (taxonomical) name`,
        multiple: false
    },
    images: {
        alias: `image`,
        prompt: `a direct imgur link to a clear image of the animal`,
        multiple: true,
        delimiter: `\n`
    },
    description: {
        alias: `desctiption`,
        prompt: `a short description of the animal`,
        multiple: false
    },
    naturalHabitat: {
        alias: `natural habitat`,
        prompt: `a brief overview of the animal's natural habitat`,
        multiple: false
    },
    wikiPage: {
        alias: `wikipedia page`,
        prompt: `the link for the animal's species' Wikipedia page`,
        multiple: false
    },
    family: {
        alias: `family`,
        prompt: `the animal's family within The Beastiary`,
        multiple: false
    }
}

export default mongoose.model(`Species`, SpeciesSchema);