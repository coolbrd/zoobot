import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { client } from "..";
import { Species } from "../models/Species";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildSpeciesInfo from "../embedBuilders/buildSpeciesInfo";
import buildSpeciesCard from "../embedBuilders/buildSpeciesCard";
import loopValue from "../utility/loopValue";

export default class SpeciesInfoMessage extends InteractiveMessage {
    protected readonly lifetime = 30000;

    private readonly species: Species;
    
    private cardIndex = 0;
    private displayCard = true;

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

        const card = this.species.cards[this.cardIndex];

        embed.setColor(getGuildUserDisplayColor(client.user, this.channel));

        if (this.displayCard) {
            buildSpeciesCard(embed, this.species, card);
        }
        else {
            buildSpeciesInfo(embed, this.species, card);
        }

        embed.appendToFooter("\n" + this.getButtonHelpString());

        return embed;
    }

    protected async buttonPress(buttonName: string, user: User): Promise<void> {
        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(`There was an error performing inherited button press behavior in a species info message: ${error}`);
        }

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
                this.displayCard = !this.displayCard;
                break;
            }
        }
    }
}