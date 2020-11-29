import { Guild, GuildChannel } from "discord.js";
import { Document } from "mongoose";
import config from "../../../config/BotConfig";
import GameObject from "../GameObject";
import { GuildModel, playerGuildSchemaDefinition } from '../../../models/PlayerGuild';
import { stripIndent } from "common-tags";
import BeastiaryClient from "../../../bot/BeastiaryClient";

export class PlayerGuild extends GameObject {
    public readonly model = GuildModel;
    public readonly schemaDefinition = playerGuildSchemaDefinition;

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

    private _guild: Guild | undefined;

    public get guild(): Guild {
        if (!this._guild) {
            throw new Error(stripIndent`
                A guild object's guild was attepmted to be accessed before it was loaded.

                Guild object: ${this.debugString}
            `);
        }

        return this._guild;
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

    private async loadGuild(): Promise<void> {
        try {
            this._guild = await this.beastiaryClient.discordClient.guilds.fetch(this.guildId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading a guild object's guild.

                Guild object: ${this.debugString}
            `);
        }

        if (!this._guild) {
            throw new Error(stripIndent`
                A guild object's guild couldn't be found.

                Guild: ${this.debugString}
            `);
        }
    }

    public async loadFields(): Promise<void> {
        const returnPromises: Promise<unknown>[] = [];
        returnPromises.push(super.loadFields());

        returnPromises.push(this.loadGuild());

        await Promise.all(returnPromises);
    }
}