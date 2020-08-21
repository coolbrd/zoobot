import { Message, MessageEmbed, TextChannel, User, APIMessage } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';
import { getGuildUserDisplayColor, capitalizeFirstLetter, betterSend } from '../utility/toolbox';
import { client } from '..';
import { SpeciesDocument } from '../models/species';

// An interactive message that will represent an animal encounter
// The primary way for users to collect new animals
export default class EncounterMessage extends InteractiveMessage {
    // The species of the animal contained within this encounter
    readonly species: SpeciesDocument;
    caught: boolean;

    protected constructor(message: Message, buttons: string[], lifetime: number, species: SpeciesDocument) {
        super(message, buttons, lifetime);
        this.species = species;
        this.caught = false;
    }

    // Asynchronous initializer for this encounter message. To be called instead of the constructor.
    static async init(channel: TextChannel, species: SpeciesDocument): Promise<EncounterMessage> {
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
            throw new Error(`Error building the base message for an interactive message.`);
        }

        // Initialize the encounter message with the newly sent and built message
        const interactiveMessage = new EncounterMessage(message, buttons, lifetime, species);

        return interactiveMessage;
    }

    // Whenever the encounter's button is pressed
    async buttonPress(_button: string, user: User): Promise<void> {
        // Indicate that the user has caught the animal
        betterSend(this.getMessage().channel, `${user}, You caught ${this.species.commonNames[0]}!`);
        this.caught = true;
        
        // Stop this message from receiving any more input
        this.deactivate();
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
                throw new Error(`Empty footer returned from encounter message.`);
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