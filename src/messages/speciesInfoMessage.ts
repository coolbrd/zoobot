import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";

import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { client } from "..";
import { Species } from "../models/Species";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { errorHandler } from "../structures/ErrorHandler";
import buildSpeciesInfo from "../embedBuilders/buildSpeciesInfo";
import buildSpeciesCard from "../embedBuilders/buildSpeciesCard";
import loopValue from "../utility/loopValue";

export default class SpeciesInfoMessage extends InteractiveMessage {
    private readonly species: Species;
    // The current card of the species that's being displayed by the info message
    private cardIndex = 0;
    // Whether the info message is displaying a large card, or the species' details
    private cardMode = true;

    constructor(channel: TextChannel | DMChannel, species: Species) {
        super(channel, { buttons: [
            {
                name: "leftArrow",
                emoji: "⬅️",
                helpMessage: "Previous card"
            },
            {
                name: "rightArrow",
                emoji: "➡️",
                helpMessage: "Next card"
            },
            {
                name: "info",
                emoji: "❔",
                helpMessage: "Info"
            }
        ]});

        this.species = species;
    }

    public async build(): Promise<void> {
        super.build();

        try {
            await this.species.load();
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error loading a species in a species info message.");
            return;
        }

        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();

        // Determine the card to display
        const card = this.species.getCards()[this.cardIndex];

        // Set the embed's color
        embed.setColor(getGuildUserDisplayColor(client.user, this.channel));

        // When the info message is showing a large picture of the species (not details)
        if (this.cardMode) {
            buildSpeciesCard(embed, this.species, card);
        }
        // When the info message is displaying the species' details
        else {
            buildSpeciesInfo(embed, this.species, card);
        }

        embed.appendToFooter("\n" + this.getButtonHelpString());

        return embed;
    }

    public buttonPress(buttonName: string, user: User): void {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case "rightArrow": {
                this.cardIndex = loopValue(this.cardIndex + 1, 0, this.species.getCards().length);
                break;
            }
            case "leftArrow": {
                this.cardIndex = loopValue(this.cardIndex - 1, 0, this.species.getCards().length);
                break;
            }
            case "info": {
                this.cardMode = !this.cardMode;
                break;
            }
        }

        this.setEmbed(this.buildEmbed());
    }
}