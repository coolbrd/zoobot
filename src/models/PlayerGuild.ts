import mongoose, { Schema } from "mongoose";
import { PlayerGuild } from '../structures/GameObject/GameObjects/PlayerGuild';

const guildScema = new Schema({
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
});

export const GuildModel = mongoose.model("Guild", guildScema);