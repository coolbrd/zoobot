import mongoose, { Schema } from "mongoose";
import { BeastiarySchemaDefinition } from '../structures/schema/BeastiarySchema';
import { Animal } from '../structures/GameObject/GameObjects/Animal';

export const animalSchemaDefinition: BeastiarySchemaDefinition = {
    [Animal.fieldNames.speciesId]: {
        type: Schema.Types.ObjectId,
        required: true
    },
    [Animal.fieldNames.cardId]: {
        type: Schema.Types.ObjectId,
        required: true
    },
    [Animal.fieldNames.userId]: {
        type: String,
        required: true
    },
    [Animal.fieldNames.guildId]: {
        type: String,
        required: true
    },
    [Animal.fieldNames.ownerId]: {
        type: Schema.Types.ObjectId,
        required: true
    },
    [Animal.fieldNames.nickname]: {
        type: String,
        required: false
    },
    [Animal.fieldNames.experience]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true
        }
    },
    [Animal.fieldNames.released]: {
        type: Boolean,
        required: false
    }
};

const animalSchema = new Schema(animalSchemaDefinition);

export const AnimalModel = mongoose.model("Animal", animalSchema);

// Index animals by their nickname so they can be easily searched by that
AnimalModel.collection.createIndex({ [Animal.fieldNames.nickname]: "text" });