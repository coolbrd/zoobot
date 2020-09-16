import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";

import { AnimalTemplate } from "../models/animal";
import { GuildUser } from "../models/guildUser";
import { SpeciesObject } from "../models/species";

// Gets the document representing a guild user in the database
export async function getGuildUserDocument(guildMember: GuildMember): Promise<Document> {
    let guildUserDocument: Document | null;
    try {
        // Find the guild user by the given information
        guildUserDocument = await GuildUser.findOne({ userId: guildMember.user.id, guildId: guildMember.guild.id });
    }
    catch (error) {
        throw new Error(error);
    }

    // If no guild user for this member exists
    if (!guildUserDocument) {
        // Create one
        guildUserDocument = new GuildUser({
            userId: guildMember.user.id,
            guildId: guildMember.guild.id,
            animals: []
        });

        // Save it
        try {
            await guildUserDocument.save();
        }
        catch (error) {
            throw new Error(error);
        }
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

    let ownerDocument: Document;
    try {
        // Get the document that represents the owner
        ownerDocument = await getGuildUserDocument(owner);
    }
    catch (error) {
        throw new Error(error);
    }

    // Create the new animal
    const animal: AnimalTemplate = {
        species: species._id,
        image: species.images[imageIndex]._id,
        experience: 0
    };

    try {
        // Add the animal document to the owner's animal inventory
        await ownerDocument.updateOne({
            $push: {
                animals: animal
            }
        }).exec();
    }
    catch (error) {
        throw new Error(error);
    }
}

// Releases an animal of a given ID from the inventory of a given guild member
export async function releaseAnimal(member: GuildMember, animalID: Types.ObjectId): Promise<boolean> {
    // Get the guild member's document
    let guildUserDocument: Document;
    try {
        guildUserDocument = await getGuildUserDocument(member);
    }
    catch (error) {
        throw new Error(error);
    }

    // Try to remove the animal and record the result
    let result: { nModified: number }
    try {
        result = await guildUserDocument.updateOne({
            $pull: {
                animals: {
                    _id: animalID
                }
            }
        }).exec();
    }
    catch (error) {
        throw new Error('Error');
    }

    // If nothing was removed from the user's inventory
    if (result.nModified < 1) {
        // Don't throw an error, but just indicate that nothing happened
        return false;
    }
    
    // Return true after the animal has been removed
    return true;
}