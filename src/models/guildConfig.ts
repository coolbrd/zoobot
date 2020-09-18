import { Schema } from "mongoose";

export const guildConfigSchema = new Schema({
    prefix: {
        type: String,
        required: true
    }
});

export interface GuildConfigObject {
    prefix: string;
}