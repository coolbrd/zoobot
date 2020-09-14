import { GuildMember } from "discord.js";
import mongoose, { Document, Schema, Types } from "mongoose";

import { getGuildMember } from "../utility/toolbox";

const guildUserSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    animals: {
        type: [Schema.Types.ObjectId],
        required: true
    }
});

export const GuildUser = mongoose.model('GuildUser', guildUserSchema);

export class GuildUserObject {
    public readonly userId: string;
    public readonly guildId: string;
    public readonly animals: Types.ObjectId[];

    public readonly member: GuildMember;

    constructor(guildUserDocument: Document) {
        this.userId = guildUserDocument.get('userId');
        this.guildId = guildUserDocument.get('guildId');
        this.animals = guildUserDocument.get('animals');

        this.member = getGuildMember(this.userId, this.guildId);
    }
}