import { GuildMember } from "discord.js";
import mongoose, { Document, Schema } from "mongoose";

import { getGuildMember } from "../discordUtility/getGuildMember";
import { AnimalObject, animalSchema } from "./animal";

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
        type: [animalSchema],
        required: true
    }
});

export const GuildUser = mongoose.model('GuildUser', guildUserSchema);

export class GuildUserObject {
    public readonly userId: string;
    public readonly guildId: string;
    public readonly animals: AnimalObject[] = [];

    public readonly member: GuildMember;

    constructor(guildUserDocument: Document) {
        this.userId = guildUserDocument.get('userId');
        this.guildId = guildUserDocument.get('guildId');

        guildUserDocument.get('animals').forEach((animalDocument: Document) => {
            this.animals.push(new AnimalObject(animalDocument));
        });

        this.member = getGuildMember(this.userId, this.guildId);
    }
}