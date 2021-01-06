import mongoose, { Schema } from "mongoose";
import { BeastiarySchemaDefinition } from '../structures/schema/BeastiarySchema';
import { Species } from '../structures/GameObject/GameObjects/Species';

const cardSubSchema = new Schema({
    url: {
        type: String,
        required: true
    },
    rarity: {
        type: Number,
        required: true
    },
    breed: {
        type: String,
        required: false
    },
    special: {
        type: String,
        required: false
    }
});

export const speciesSchemaDefinition: BeastiarySchemaDefinition = {
    [Species.fieldNames.commonNames]: [{
        name: {
            type: String,
            required: true
        },
        article: {
            type: String,
            required: true
        }
    }],
    [Species.fieldNames.commonNamesLower]: {
        type: Array,
        required: true
    },
    [Species.fieldNames.scientificName]: {
        type: String,
        required: true
    },
    [Species.fieldNames.cards]: {
        type: [cardSubSchema],
        required: true
    },
    [Species.fieldNames.description]: {
        type: String,
        required: true
    },
    [Species.fieldNames.naturalHabitat]: {
        type: String,
        required: false
    },
    [Species.fieldNames.wikiPage]: {
        type: String,
        required: true
    },
    [Species.fieldNames.rarityTier]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true
        }
    },
    [Species.fieldNames.token]: {
        type: String,
        required: true
    }
};

const speciesSchema = new Schema(speciesSchemaDefinition);

export const SpeciesModel = mongoose.model("Species", speciesSchema);

SpeciesModel.collection.createIndex({ [Species.fieldNames.commonNamesLower]: "text" });