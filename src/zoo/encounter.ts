import { TextChannel, Message, APIMessage, MessageEmbed, User, GuildResolvable } from 'discord.js';

import SpeciesModel from '../models/species';
import { InteractiveMessage } from '../utility/interactiveMessage';
import Species from './species';
import { capitalizeFirstLetter, getGuildUserDisplayColor, betterSend } from '../utility/toolbox';
import { client } from '..';

// Performs a chance to spawn an animal encounter in a guild
export async function guildAnimalChance(guild: GuildResolvable): Promise<void> {
    // Generate a random real number to use in determining animal spawning
    const chance = Math.random();
    // 10% of all messages (for testing purposes)
    if (chance <= 0.1) {
        try {
            // Spawn an animal encounter
            await spawnAnimal(guild);
        }
        catch (error) {
            console.error("Error trying to spawn an animal in a guild.", error);
        }
    }
}

// Spawn an animal encounter in a given server
async function spawnAnimal(guildResolvable: GuildResolvable) {
    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error("Attempted to spawn an animal in a guild that could not be resolved.");
    }

    let channel: TextChannel;
    try {
        // Get the first text channel in the server
        channel = guild.channels.cache.find(channel => channel.type === `text`) as TextChannel;
        if (!channel) {
            throw new Error("No valid text channel was found when attempting to retrieve the first one.");
        }
    }
    catch (error) {
        console.error(`Error trying to find the first text channel of a guild for encounter spawning.`, error);
        return;
    }
    
    let species: Species;
    try {
        // Get a random species from all animals and convert it to a proper species instance
        species = new Species((await SpeciesModel.aggregate().sample(1).exec())[0]);
        if (!species) {
            throw new Error("No document was returned when trying to select a random animal.");
        }
    }
    catch (error) {
        console.error(`Error trying to select a random species for a new encounter message.`, error);
        return;
    }

    try {
        // Make sure the species has all required fields
        species.ensureFields();
    }
    catch (error) {
        console.error(`Species of id ${species[`_id`]} missing one or more required properties.`, error);
        return;
    }
    // If we're down here it means the species has everything it needs

    try {
        // Send an encounter message to the channel
        await EncounterMessage.init(channel, species);
    }
    catch (error) {
        console.error(`Error initializing a new encounter message.`, error);
        return;
    }
}

// The interactive message that will represent an animal encounter
// The primary way for users to collect new animals
class EncounterMessage extends InteractiveMessage {
    // The species of the animal contained within this encounter
    readonly species: Species;
    caught: boolean;

    protected constructor(message: Message, buttons: string[], lifetime: number, species: Species) {
        super(message, buttons, lifetime);
        this.species = species;
        this.caught = false;
    }

    // Asynchronous initializer for this encounter message. To be called instead of the constructor.
    static async init(channel: TextChannel, species: Species): Promise<EncounterMessage | undefined> {
        // Interactive message defaults for an encounter message
        // Left in the init method rather than the constructor as a reminder that this data can be fetched asynchronously
        const buttons = [`🔘`];
        const lifetime = 60000;

        const embed = new MessageEmbed();
        embed.setColor(getGuildUserDisplayColor(client.user as User, channel.guild) || `DEFAULT`);
        embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));
        embed.setURL(species.wikiPage);
        embed.setDescription(capitalizeFirstLetter(species.scientificName));
        embed.setImage(species.images[Math.floor(Math.random() * species.images.length)]);
        embed.setFooter(`Wild encounter`);

        const content = new APIMessage(channel, { embed: embed });

        let message;
        try {
            // Attempt to send the base message for this encounter
            message = await this.build(content, channel, buttons) as Message;
        }
        catch (error) {
            console.error(`Error building the base message for an interactive message.`, error);
            return;
        }

        // Initialize the encounter message with the newly sent and built message
        const interactiveMessage = new EncounterMessage(message, buttons, lifetime, species);

        return interactiveMessage;
    }

    async buttonPress(button: string, user: User): Promise<void> {
        if (this.getButtons().includes(button)) {
            betterSend(this.getMessage().channel, `${user}, You caught ${this.species.commonNames[0]}!`);
            this.caught = true;
            this.deactivate();
        }
    }

    async deactivate(): Promise<void> {
        // Inherit parent deactivation behavior
        super.deactivate();

        try {
            // Get the embed of the encounter message
            const embed = this.getMessage().embeds[0];

            // Get the embed's footer
            const footer = embed.footer;

            // If for some reason there isn't a footer
            if (!footer) {
                console.error(`Empty footer returned from encounter message.`);
                return;
            }

            let newEmbed: MessageEmbed;
            // Edit the encounter's embed based on what happen to the animal
            if (this.caught) {
                newEmbed = embed.setFooter(`${footer.text} (caught)`);
            }
            else {
                newEmbed = embed.setFooter(`${footer.text} (fled)`);
            }
            // Update the message
            await this.getMessage().edit(newEmbed);
        }
        catch (error) {
            console.error(`Error trying to edit an embed on an interactive message.`, error);
        }
    }
}