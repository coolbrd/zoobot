import mongoose, { Schema, Types } from "mongoose";
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

const speciesSchema = new Schema({
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
    [Species.fieldNames.rarity]: {
        type: Number,
        required: true
    }
});

export const SpeciesModel = mongoose.model("Species", speciesSchema);

SpeciesModel.collection.createIndex({ [Species.fieldNames.commonNamesLower]: "text" });