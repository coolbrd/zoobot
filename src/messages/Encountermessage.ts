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
import config from "../config/BotConfig";
import rarityToEmbedColor from "../beastiary/rarityToEmbedColor";

// An interactive message that will represent an animal encounter
export default class EncounterMessage extends InteractiveMessage {
    // Override base channel field, because EncounterMessage can only be sent in TextChannels
    public readonly channel: TextChannel;

    // The species of the animal contained within this encounter
    private readonly species: Species;

    // The card of the animal to display
    private readonly card: SpeciesCard;

    // The list of user ids corresponsing to users who've already tried to capture this animal
    private readonly warnedUserIds: string[] = [];

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
        embed.setColor(rarityToEmbedColor(species.rarity));

        embed.setTitle(capitalizeFirstLetter(this.species.commonNames[0]));

        embed.addField("――――――――", capitalizeFirstLetter(this.species.scientificName), true);

        // Determine the animal's card
        this.card = this.species.getRandomCard();
        embed.setImage(this.card.url);

        // Add the breed field if it's there
        if (this.card.breed) {
            embed.addField("Breed", capitalizeFirstLetter(this.card.breed), true);
        }

        if (this.card.special) {
            embed.addField("Special", capitalizeFirstLetter(this.card.special), true);
        }

        embed.setFooter("Wild encounter");

        this.setEmbed(embed);
    }

    // Whenever the encounter's button is pressed
    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Get the guild member who pressed the capture button
        const guildMember = getGuildMember(user, this.channel.guild);
        // Get the player object corresponding to the member
        const player = await beastiary.players.fetch(guildMember);

        // If this player has a recorded last capture
        if (player.lastCapture) {
            // Right now
            const now = new Date();

            // If the difference between now and the player's last capture isn't greater than the capture period (can't capture)
            if (now.valueOf() - player.lastCapture.valueOf() < config.capturePeriod) {
                // If this player hasn't received a message from this encounter yet notifying their capture status
                if (!this.warnedUserIds.includes(user.id)) {
                    // The time when the player can claim next
                    const nextClaim = new Date(player.lastCapture.valueOf() + config.capturePeriod);

                    // Values pertaining to how much time remains before the player can claim again
                    const secondsToNextClaim = (nextClaim.valueOf() - now.valueOf()) / 1000;
                    const minutesToNextClaim = secondsToNextClaim / 60;
                    const hoursToNextClaim = Math.floor(minutesToNextClaim / 60);
                    const leftoverMinutes = Math.floor(minutesToNextClaim % 60);
                    const leftoverSeconds = Math.floor(secondsToNextClaim % 60);

                    betterSend(this.channel, `${user}, you can't capture an animal for another **${hoursToNextClaim}h ${leftoverMinutes}m ${leftoverSeconds}s**.`);
                    
                    // Add the player's user id to the list of users that have been informed, preventing their ability to spam with this encounter
                    this.warnedUserIds.push(user.id);
                }

                // Don't let the player capture the animal
                return;
            }
        }

        // Get the species' primary common name object
        const commonName = this.species.commonNameObjects[0];

        // Indicate that the player has caught the animal
        betterSend(this.channel, `${user}, you caught ${commonName.article} ${commonName.name}!`);
        this.setDeactivationText("(caught)");

        // Create the new animal
        try {
            await beastiary.animals.createAnimal(guildMember, this.species, this.card);
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error creating a new animal in an encounter message.");

            betterSend(this.channel, "There was an error creating a new animal from an encounter, sorry if you didn't get your animal! Please report this to the developer and you can be compensated.");

            return;
        }

        try {
            await player.captureAnimal();
        }
        catch (error) {
            throw new Error(`There was an error resetting a player's last claim: ${error}`);
        }

        // Stop this message from receiving any more input
        this.deactivate();
    }
}