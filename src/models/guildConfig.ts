import { Schema } from "mongoose";

// A subschema representing a guild's configurable settings
export const guildConfigSchema = new Schema({
    prefix: {
        type: String,
        required: true
    }
});

export interface GuildConfigTemplate {
    prefix: string;
}