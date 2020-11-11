import mongoose, { Schema } from "mongoose";
import { Animal } from '../structures/GameObject/GameObjects/Animal';

const animalSchema = new Schema({
    [Animal.fieldNames.ownerId]: {
        type: String,
        required: true
    },
    [Animal.fieldNames.guildId]: {
        type: String,
        required: true
    },
    [Animal.fieldNames.speciesId]: {
        type: Schema.Types.ObjectId,
        ref: "Species",
        required: true
    },
    [Animal.fieldNames.cardId]: {
        type: Schema.Types.ObjectId,
        required: true
    },
    [Animal.fieldNames.nickname]: {
        type: String,
        required: false
    },
    [Animal.fieldNames.experience]: {
        type: Number,
        required: true
    }
});

export const AnimalModel = mongoose.model("Animal", animalSchema);

// Index animals by their nickname so they can be easily searched by that
AnimalModel.collection.createIndex({ [Animal.fieldNames.nickname]: "text" });