import mongoose, { Schema } from "mongoose";
import PendingSpecies from '../structures/GameObject/GameObjects/PendingSpecies';

const pendingSpeciesSchema = new Schema({
    [PendingSpecies.fieldNames.commonNames]: {
        type: [String],
        required: true,
    },
    [PendingSpecies.fieldNames.commonNamesLower]: {
        type: [String],
        required: true
    },
    [PendingSpecies.fieldNames.scientificName]: {
        type: String,
        required: true,
    },
    [PendingSpecies.fieldNames.images]: {
        type: [String],
        required: false,
    },
    [PendingSpecies.fieldNames.description]: {
        type: String,
        required: false,
    },
    [PendingSpecies.fieldNames.naturalHabitat]: {
        type: String,
        required: false,
    },
    [PendingSpecies.fieldNames.wikiPage]: {
        type: String,
        required: false,
    },
    [PendingSpecies.fieldNames.author]: {
        type: String,
        required: true
    }
});

export const PendingSpeciesModel = mongoose.model("PendingSpecies", pendingSpeciesSchema);