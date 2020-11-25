import mongoose, { Schema } from "mongoose";
import { BeastiarySchemaDefinition } from '../structures/schema/BeastiarySchema';
import PendingSpecies from '../structures/GameObject/GameObjects/PendingSpecies';

export const pendingSpeciesSchemaDefinition: BeastiarySchemaDefinition = {
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
};

const pendingSpeciesSchema = new Schema(pendingSpeciesSchemaDefinition);

export const PendingSpeciesModel = mongoose.model("PendingSpecies", pendingSpeciesSchema);