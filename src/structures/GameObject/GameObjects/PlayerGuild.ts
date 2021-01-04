import { Guild, GuildChannel } from "discord.js";
import { Document } from "mongoose";
import config from "../../../config/BotConfig";
import GameObject from "../GameObject";
import { GuildModel, playerGuildSchemaDefinition } from '../../../models/PlayerGuild';
import { stripIndent } from "common-tags";

export class PlayerGuild extends GameObject {
    public readonly model = GuildModel;
    public readonly schemaDefinition = playerGuildSchemaDefinition;

    public static readonly fieldNames = {
        guildId: "guildId",
        prefix: "prefix",
        encounterChannelId: "encounterChannelId",
        announcementChannelId: "announcementChannelId",
        premium: "premium"
    };

    public static newDocument(guild: Guild): Document {
        return new GuildModel({
            [PlayerGuild.fieldNames.guildId]: guild.id,
            [PlayerGuild.fieldNames.prefix]: config.prefix,
            [PlayerGuild.fieldNames.premium]: false
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

    public get announcementChannelId(): string | undefined {
        return this.document.get(PlayerGuild.fieldNames.announcementChannelId);
    }

    public set announcementChannelId(announcementChannelId: string | undefined) {
        this.setDocumentField(PlayerGuild.fieldNames.announcementChannelId, announcementChannelId);
    }

    public get premium(): boolean {
        return this.document.get(PlayerGuild.fieldNames.premium);
    }

    public set premium(premium: boolean) {
        this.setDocumentField(PlayerGuild.fieldNames.premium, premium);
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

    public async applyPotentialPremium(): Promise<void> {
        let hasPremium: boolean;
        try {
            hasPremium = await this.beastiaryClient.beastiary.playerGuilds.hasPremium(this.guildId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error checking is a player guild has premium.

                Player guild: ${this.debugString}

                ${error}
            `);
        }

        this.premium = hasPremium;
    }

    public async loadFields(): Promise<void> {
        const returnPromises: Promise<unknown>[] = [];

        returnPromises.push(super.loadFields());
        returnPromises.push(this.loadGuild());
        returnPromises.push(this.applyPotentialPremium());

        await Promise.all(returnPromises);
    }
}