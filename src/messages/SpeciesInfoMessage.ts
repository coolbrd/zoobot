import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { client } from "..";
import { Species } from "../models/Species";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildSpeciesInfo from "../embedBuilders/buildSpeciesInfo";
import buildSpeciesCard from "../embedBuilders/buildSpeciesCard";
import loopValue from "../utility/loopValue";

// A message that displays a given species' information
export default class SpeciesInfoMessage extends InteractiveMessage {
    protected readonly lifetime = 30000;

    private readonly species: Species;
    // The current card of the species that's being displayed by the info message
    private cardIndex = 0;
    // Whether the info message is displaying a large card, or the species' details
    private cardMode = true;

    constructor(channel: TextChannel | DMChannel, species: Species) {
        super(channel);

        this.addButtons([
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
        ]);

        this.species = species;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        // Determine the card to display
        const card = this.species.cards[this.cardIndex];

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

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case "rightArrow": {
                this.cardIndex = loopValue(this.cardIndex + 1, 0, this.species.cards.length - 1);
                break;
            }
            case "leftArrow": {
                this.cardIndex = loopValue(this.cardIndex - 1, 0, this.species.cards.length - 1);
                break;
            }
            case "info": {
                this.cardMode = !this.cardMode;
                break;
            }
        }

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(`There was an error refreshing a species info message's embed: ${error}`);
        }
    }
}