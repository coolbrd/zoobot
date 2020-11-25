import mongoose, { Schema } from "mongoose";
import gameConfig from '../config/gameConfig';
import { BeastiarySchemaDefinition } from '../structures/schema/BeastiarySchema';
import { Player } from '../structures/GameObject/GameObjects/Player';

export const playerSchemaDefinition: BeastiarySchemaDefinition = {
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
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.collectionUpgradeLevel]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.collectionAnimalIds]: {
        type: [Schema.Types.ObjectId],
        required: true
    },
    [Player.fieldNames.crewAnimalIds]: {
        type: [Schema.Types.ObjectId],
        required: false,
        fieldRestrictions: {
            defaultValue: [],
            maxListSize: gameConfig.maxCrewSize,
            allowDuplicates: false
        }
    },
    [Player.fieldNames.lastDailyCurrencyReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.freeCapturesLeft]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.extraCapturesLeft]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.lastCaptureReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.totalCaptures]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.freeEncountersLeft]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.extraEncountersLeft]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.lastEncounterReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.totalEncounters]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.freeXpBoostsLeft]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.extraXpBoostsLeft]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.lastXpBoostReset]: {
        type: Schema.Types.Date,
        required: true
    },
    [Player.fieldNames.totalXpBoosts]: {
        type: Number,
        required: true,
        fieldRestrictions: {
            defaultValue: 0,
            nonNegative: true   
        }
    },
    [Player.fieldNames.tokenSpeciesIds]: {
        type: [Schema.Types.ObjectId],
        required: true
    }
};

const playerSchema = new Schema(playerSchemaDefinition);

export const PlayerModel = mongoose.model("Player", playerSchema);