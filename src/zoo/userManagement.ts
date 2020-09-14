import { GuildMember } from "discord.js";
import { Document } from "mongoose";

import { Animal } from "../models/animal";
import { GuildUser } from "../models/guildUser";
import { SpeciesObject } from "../models/species";

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

    if (options && options.imageIndex) {
        imageIndex = options.imageIndex;
    }
    else {
        imageIndex = Math.floor(Math.random() * species.images.length);
    }

    // Create the new animal
    const animal = new Animal({
        species: species._id,
        ownerId: owner.user.id,
        guildId: owner.guild.id,
        image: species.images[imageIndex]._id,
        experience: 0
    });

    // Get the document that represents the owner
    const ownerDocument = await getGuildUserDocument(owner);

    // Save the animal to the database
    return animal.save().then(newAnimal => {
        // Add the animal's ID to the owner's list of animals
        // Do this only after the animal document has been saved in order to heavily couple these two operations
        ownerDocument.updateOne({ $push: {
            animals: newAnimal._id
        }}).exec();
    }).catch(error => {
        console.error('Failed saving a new animal document.', error);
    });
}