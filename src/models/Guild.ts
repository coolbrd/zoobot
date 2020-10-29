import mongoose, { Document, Schema } from "mongoose";
import config from "../config/BotConfig";
import GameObject from "../structures/GameObject";

// A guild with at least one player in it. Does not exist for guilds that have not used any game commands.
export class PlayerGuild extends GameObject {
    public readonly model = GuildModel;

    public static readonly fieldNames = {
        guildId: "guildId",
        config: "config"
    };

    public static newDocument(guildId: string): Document {
        // Make one and save it
        return new GuildModel({
            guildId: guildId,
            config: {
                prefix: config.prefix
            }
        });
    }

    public get guildId(): string {
        return this.document.get(PlayerGuild.fieldNames.guildId);
    }

    public get config(): GuildConfigTemplate {
        return this.document.get(PlayerGuild.fieldNames.config);
    }

    public get prefix(): string {
        return this.config.prefix;
    }

    public set prefix(prefix: string) {
        this.modify();
        this.config.prefix = prefix;
    }
}

// A subschema representing a guild's configurable settings
const guildConfigSchema = new Schema({
    prefix: {
        type: String,
        required: true
    }
});

interface GuildConfigTemplate {
    prefix: string;
}

const guildScema = new Schema({
    [PlayerGuild.fieldNames.guildId]: {
        type: String,
        required: true
    },
    [PlayerGuild.fieldNames.config]: {
        type: guildConfigSchema,
        required: true
    }
});

export const GuildModel = mongoose.model("Guild", guildScema);