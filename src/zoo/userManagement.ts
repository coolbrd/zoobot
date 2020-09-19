import { Guild, GuildMember } from "discord.js";
import { Document } from "mongoose";
import { getGuildMember } from "../discordUtility/getGuildMember";
import { Animal, AnimalObject } from "../models/animal";

import { GuildModel, GuildObject } from "../models/guild";
import { Player, PlayerObject } from "../models/player";
import { SpeciesObject } from "../models/species";

// Gets a guild document from the database that corresponds to a given guild object and returns it as an object
export async function getGuildObject(guild: Guild): Promise<GuildObject> {
    // Attempt to find an existing document that represents this guild
    let guildDocument: Document | null;
    try {
        guildDocument = await GuildModel.findOne({ id: guild.id });
    }
    catch (error) {
        throw new Error(error);
    }

    // If no document currently represents the guild
    if (!guildDocument) {
        // Make one and save it
        guildDocument = new GuildModel({
            id: guild.id,
            config: {
                prefix: '>'
            }
        });

        await guildDocument.save();
    }

    // Return the pre-existing or newly created guild document within a wrapper object
    return new GuildObject(guildDocument);
}

// Gets the wrapper object representing a guild player in the database
export async function getPlayerObject(guildMember: GuildMember): Promise<PlayerObject> {
    // Attempt to find a player document with the given information
    let playerDocument: Document | null;
    try {
        playerDocument = await Player.findOne({ userId: guildMember.user.id, guildId: guildMember.guild.id });
    }
    catch (error) {
        console.error('There was an error trying to find a player document.');
        throw new Error(error);
    }

    // If no player document exists for the given guild member
    if (!playerDocument) {
        // Create one
        playerDocument = new Player({
            userId: guildMember.user.id,
            guildId: guildMember.guild.id
        });

        // Save it
        try {
            await playerDocument.save();
        }
        catch (error) {
            console.error('There was an error trying to save a new player document.');
            throw new Error(error);
        }
    }

    // Return the player document within a wrapper object
    return new PlayerObject(playerDocument._id);
}

// Takes a species and an owner, and creates a new animal assigned to that owner in the database
export async function createAnimal(owner: GuildMember, species: SpeciesObject, options?: { imageIndex: number }): Promise<void> {
    let imageIndex: number;
    // If an image index was provided
    if (options && options.imageIndex !== undefined) {
        // Use the provided image
        imageIndex = options.imageIndex;
    }
    // If no image index was provided
    else {
        // Pick a random image
        imageIndex = Math.floor(Math.random() * species.getImages().length);
    }

    // Get the player object of the guild member
    let ownerObject: PlayerObject;
    try {
        ownerObject = await getPlayerObject(owner);
        await ownerObject.load();
    }
    catch (error) {
        throw new Error(error);
    }

    // Create the new animal
    const animal = new Animal({
        ownerId: ownerObject.getUserId(),
        guildId: ownerObject.getGuildId(),
        species: species.getId(),
        image: species.getImages()[imageIndex].getId(),
        experience: 0
    });

    // Save the new animal
    try {
        await animal.save();
    }
    catch (error) {
        console.error('There was an error trying to save a new animal.');
        throw new Error(error);
    }

    try {
        await ownerObject.addAnimal(animal._id);
    }
    catch (error) {
        console.error('There was an error trying to add a new animal id to a player object\'s inventory.');
        throw new Error(error);
    }
}

export async function deleteAnimal(animalObject: AnimalObject): Promise<void> {
    const playerObject = await getPlayerObject(getGuildMember(animalObject.getOwnerId(), animalObject.getGuildId()));

    playerObject.removeAnimal(animalObject.getId());
    animalObject.delete();
}