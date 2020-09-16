import mongoose, { Schema } from "mongoose";

const guildScema = new Schema({
    guildID: {
        type: String,
        required: true
    },
    commandPrefix: {
        type: String,
        required: true
    }
});

export const GuildModel = mongoose.model('Guild', guildScema);