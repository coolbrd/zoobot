import { Guild, GuildChannel } from "discord.js";
import mongoose, { Document, Schema } from "mongoose";
import { client } from "..";
import config from "../config/BotConfig";
import GameObject from "../structures/GameObject";

export class PlayerGuild extends GameObject {
    public readonly model = GuildModel;

    public static readonly fieldNames = {
        guildId: "guildId",
        prefix: "prefix",
        encounterChannelId: "encounterChannelId"
    };

    public static newDocument(guild: Guild): Document {
        return new GuildModel({
            [PlayerGuild.fieldNames.guildId]: guild.id,
            [PlayerGuild.fieldNames.prefix]: config.prefix
        });
    }

    public readonly guild: Guild;

    constructor(guildDocument: Document) {
        super(guildDocument);

        const guild = client.guilds.resolve(this.guildId);

        if (!guild) {
            throw new Error("A player guild with an invalid guild id tried to resolve its id to a guild.");
        }

        this.guild = guild;
    }

    public get guildId(): string {
        return this.document.get(PlayerGuild.fieldNames.guildId);
    }

    public get prefix(): string {
        return this.document.get(PlayerGuild.fieldNames.prefix);
    }

    public set prefix(prefix: string) {
        this.setDocumentField(PlayerGuild.fieldNames.prefix, prefix);
    }

    public get encounterChannelId(): string | undefined {
        return this.document.get(PlayerGuild.fieldNames.encounterChannelId);
    }

    public set encounterChannelId(encounterChannelId: string | undefined) {
        this.setDocumentField(PlayerGuild.fieldNames.encounterChannelId, encounterChannelId);
    }

    public get encounterGuildChannel(): GuildChannel | undefined {
        if (!this.encounterChannelId) {
            return;
        }

        const encounterGuildChannel = this.guild.channels.resolve(this.encounterChannelId) || undefined;

        if (!encounterGuildChannel) {
            this.encounterChannelId = undefined;
        }

        return encounterGuildChannel;
    }
}

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