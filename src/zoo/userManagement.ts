import { Guild, GuildMember } from "discord.js";
import { Document, Types } from "mongoose";
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
    return new GuildObject({document: guildDocument});
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
    return new PlayerObject({document: playerDocument});
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

    // Add the animal's id to the owner's inventory
    try {
        await ownerObject.addAnimal(animal._id);
    }
    catch (error) {
        console.error('There was an error trying to add a new animal id to a player object\'s inventory.');
        throw new Error(error);
    }
}

// Deletes an animal from existence
export async function deleteAnimal(animalInfo: {animalObject?: AnimalObject, animalId?: Types.ObjectId, playerObject?: PlayerObject}): Promise<void> {
    let playerObject: PlayerObject | undefined;
    let animalObject: AnimalObject;

    // If a player object was provided already
    if (animalInfo.playerObject) {
        // Don't waste any time trying to find it again
        playerObject = animalInfo.playerObject;
    }

    // If an animal object was provided already
    if (animalInfo.animalObject) {
        // Again, don't query for it again
        animalObject = animalInfo.animalObject;
    }
    // If just an animal id was provided
    else if (animalInfo.animalId) {
        // Try to find the given animal
        const animalDocument = await Animal.findById(animalInfo.animalId);
        if (!animalDocument) {
            throw new Error('Couldn\'t find an animal with a given id for deletion.');
        }
        // Create a new animal object from the found document. It doesn't need to be loaded because a document was provided.
        animalObject = new AnimalObject({document: animalDocument});
    }
    // If not enough fields were provided
    else {
        throw new Error('Not enough information provided for deleteAnimal.');
    }

    // Only query for a player object if one hasn't already been assigned
    playerObject = playerObject || await getPlayerObject(getGuildMember(animalObject.getOwnerId(), animalObject.getGuildId()));

    // Remove the animal's id from the player's inventory
    playerObject.removeAnimal(animalObject.getId());
    // Delete the animal from the animal collection
    animalObject.delete();
}

// Gets an animal object by a given inventory position from a player's inventory
export async function getAnimalByInventoryPosition(playerObject: PlayerObject, animalPosition: number): Promise<AnimalObject> {
    // Get the animal document that corresponds to the given inventory position
    const animalDocument = await Animal.findById(playerObject.getAnimalIds()[animalPosition]);

    if (!animalDocument) {
        throw new Error('An animal id with no corresponding animal document was found in a player\'s inventory.');
    }

    return new AnimalObject({ document: animalDocument });
}