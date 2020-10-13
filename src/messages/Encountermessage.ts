import { TextChannel, User } from "discord.js";

import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { client } from "..";
import { Species, SpeciesCard } from "../models/Species";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { errorHandler } from "../structures/ErrorHandler";
import { beastiary } from "../beastiary/Beastiary";

// An interactive message that will represent an animal encounter
export default class EncounterMessage extends InteractiveMessage {
    // Override base channel field, because EncounterMessage can only be sent in TextChannels
    public readonly channel: TextChannel;

    // The species of the animal contained within this encounter
    private readonly species: Species;

    private readonly card: SpeciesCard;

    constructor(channel: TextChannel, species: Species) {
        super(channel, { buttons: {
                name: "capture",
                emoji: "🔘",
                helpMessage: "Capture"
            },
            deactivationText: "(fled)"
        });
        this.channel = channel;
        this.species = species;

        const embed = new SmartEmbed();
        // Color the encounter's embed properly
        embed.setColor(getGuildUserDisplayColor(client.user, this.channel.guild));

        embed.setTitle(capitalizeFirstLetter(this.species.commonNames[0]));

        embed.addField("――――――――", capitalizeFirstLetter(this.species.scientificName), true);

        // Determine the animal's card
        this.card = this.species.getRandomCard();
        embed.setImage(this.card.url);

        // Add the breed field if it's there
        if (this.card.breed) {
            embed.addField("Breed", capitalizeFirstLetter(this.card.breed), true);
        }

        embed.setFooter("Wild encounter");

        this.setEmbed(embed);
    }

    // Whenever the encounter's button is pressed
    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Get the species' primary common name object
        const commonName = this.species.commonNameObjects[0];

        // Indicate that the user has caught the animal
        betterSend(this.message.channel, `${user}, you caught ${commonName.article} ${commonName.name}!`);
        this.setDeactivationText("(caught)");

        // Create the new animal
        try {
            await beastiary.animals.createAnimal(getGuildMember(user, this.channel.guild), this.species, this.card);
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error creating a new animal in an encounter message.");

            betterSend(this.channel, "There was an error creating a new animal from an encounter, sorry if you didn't get your animal! Please report this to the developer and you can be compensated.");
        }
        finally {
            // Stop this message from receiving any more input
            this.deactivate();
        }
    }
}