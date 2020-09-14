import { GuildMember } from "discord.js";
import { Document } from "mongoose";

import { AnimalTemplate } from "../models/animal";
import { GuildUser } from "../models/guildUser";
import { SpeciesObject } from "../models/species";

// Gets the document representing a guild user in the database
export async function getGuildUserDocument(guildMember: GuildMember): Promise<Document> {
    // Find the guild user by the given information
    let guildUserDocument = await GuildUser.findOne({ userId: guildMember.user.id, guildId: guildMember.guild.id });
    // If no guild user for this member exists
    if (!guildUserDocument) {
        // Create one
        guildUserDocument = new GuildUser({
            userId: guildMember.user.id,
            guildId: guildMember.guild.id,
            animals: []
        });
        await guildUserDocument.save();
    }

    return guildUserDocument;
}

// Takes a species and an owner, and creates a new animal assigned to that owner in the database
export async function createAnimal(owner: GuildMember, species: SpeciesObject, options?: { imageIndex: number }): Promise<void> {
    let imageIndex: number;

    if (options && options.imageIndex !== undefined) {
        imageIndex = options.imageIndex;
    }
    else {
        imageIndex = Math.floor(Math.random() * species.images.length);
    }

    // Get the document that represents the owner
    const ownerDocument = await getGuildUserDocument(owner);

    // Create the new animal
    const animal: AnimalTemplate = {
        species: species._id,
        image: species.images[imageIndex]._id,
        experience: 0
    };

    // Add the animal document to the owner's animal inventory
    ownerDocument.updateOne({
        $push: {
            animals: animal
        }
    }).exec();
}