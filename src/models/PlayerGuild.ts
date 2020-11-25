import mongoose, { Schema } from "mongoose";
import { BeastiarySchemaDefinition } from '../structures/schema/BeastiarySchema';
import { PlayerGuild } from '../structures/GameObject/GameObjects/PlayerGuild';

export const playerGuildSchemaDefinition: BeastiarySchemaDefinition = {
    [PlayerGuild.fieldNames.guildId]: {
        type: String,
        required: true
    },
    [PlayerGuild.fieldNames.prefix]: {
        type: String,
        required: true
    },
    [PlayerGuild.fieldNames.encounterChannelId]: {
        type: String,
        required: false
    }
};

const guildScema = new Schema(playerGuildSchemaDefinition);

export const GuildModel = mongoose.model("Guild", guildScema);