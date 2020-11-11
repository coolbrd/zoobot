import mongoose, { Schema } from "mongoose";
import { Player } from '../structures/GameObject/GameObjects/Player';

const playerSchema = new Schema({
    [Player.fieldNames.userId]: {
        type: String,
        required: true
    },
    [Player.fieldNames.guildId]: {
        type: String,
        required: true
    },
    [Player.fieldNames.scraps]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.collectionUpgradeLevel]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.collectionAnimalIds]: {
        type: [Schema.Types.ObjectId],
        required: true
    },
    [Player.fieldNames.crewAnimalIds]: {
        type: [Schema.Types.ObjectId],
        required: false
    },
    [Player.fieldNames.freeCapturesLeft]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.extraCapturesLeft]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.lastCaptureReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.totalCaptures]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.freeEncountersLeft]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.extraEncountersLeft]: {
        type: Number,
        required: true
    },
    [Player.fieldNames.lastEncounterReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.totalEncounters]: {
        type: Number,
        required: true
    }
});

export const PlayerModel = mongoose.model("Player", playerSchema);