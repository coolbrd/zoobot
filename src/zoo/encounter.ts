import { Guild, TextChannel, Message, APIMessage, MessageEmbed, PartialUser, User } from "discord.js";

import SpeciesModel from "../models/species";
import { InteractiveMessage } from "../utility/interactiveMessage";
import Species from "./species";
import { capitalizeFirstLetter, getGuildUserDisplayColor } from "../utility/toolbox";
import { client } from "..";

export async function guildAnimalChance(guild: Guild) {
    // Generate a random real number to use in determining animal spawning
    const chance = Math.random();
    // 50% of all messages
    if (chance <= 1) {
        // Spawn an animal encounter
        return await spawnAnimal(guild);
    }
}

// Spawn an animal encounter in a given server
async function spawnAnimal(guild: Guild) {
    let channel: TextChannel;
    try {
        // Get the first text channel in the server
        channel = guild.channels.cache.find(channel => channel.type === "text") as TextChannel;
    }
    catch(error) {
        console.error("Error trying to find the first text channel of a guild for encounter spawning.", error);
        return;
    }
    
    let speciesDocument: any;
    try {
        // Get a random species from all animals
        speciesDocument = (await SpeciesModel.aggregate().sample(1).exec())[0];
    }
    catch(error) {
        console.error("Error trying to select a random species for a new encounter message.", error);
        return;
    }

    let species: Species;
    try {
        // Convert the species document to a proper species (checks for errors and such)
        species = new Species(speciesDocument);
    }
    catch(error) {
        console.error("Error trying to convert a species document to a species instance.", error);
        return;
    }

    try {
        // Send an encounter message to the channel
        await EncounterMessage.init(channel, species);
    }
    catch(error) {
        console.error("Error initializing a new encounter message.", error);
        return;
    }
}

// The interactive message that will represent an animal encounter
// The primary way for users to collect new animals
export class EncounterMessage extends InteractiveMessage {
    // The species of the animal contained within this encounter
    readonly species: Species;

    protected constructor(message: Message, buttons: string[], lifetime: number, species: Species) {
        super(message, buttons, lifetime);
        this.species = species;
    }

    // Asynchronous initializer for this encounter message. To be called instead of the constructor.
    static async init(channel: TextChannel, species: Species) {
        // Interactive message defaults for an encounter message
        // Left in the init method rather than the constructor as a reminder that this data can be fetched asynchronously
        const buttons = ["💥"];
        const lifetime = 60000;

        const embed = new MessageEmbed();
        embed.setColor(getGuildUserDisplayColor(client.user as User, channel.guild) || "DEFAULT");
        embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));
        embed.setURL(species.wikiPage);
        embed.setDescription(species.scientificName);
        embed.setImage(species.images[Math.floor(Math.random() * species.images.length)]);
        embed.setFooter("Wild encounter");

        const content = new APIMessage(channel, { embed: embed });

        let message;
        try {
            // Attempt to send the base message for this encounter
            message = await this.build(content, channel, buttons) as Message;
        }
        catch(error) {
            console.error("Error building the base message for an interactive message.", error);
            return;
        }

        // Initialize the encounter message with the newly sent and built message
        const interactiveMessage = new EncounterMessage(message, buttons, lifetime, species);

        return interactiveMessage;
    }

    async buttonPress(button: string, user: User | PartialUser) {
        if (this.getButtons().includes(button)) {
            this.getMessage().channel.send(`You caught ${this.species.commonNames[0]}!`);
        }
    }

    async deactivate() {
        // Inherit parent deactivation behavior
        super.deactivate();

        try {
            // Indicate that the encounter is over
            await this.getMessage().edit("*(gone)*");
        }
        catch(error) {
            console.error("Error trying to edit an interactive message.", error);
        }
    }
}