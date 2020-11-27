import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Species } from "../structures/GameObject/GameObjects/Species";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildSpeciesInfo from "../embedBuilders/buildSpeciesInfo";
import buildSpeciesCard from "../embedBuilders/buildSpeciesCard";
import loopValue from "../utility/loopValue";
import { stripIndent } from "common-tags";
import { Player } from "../structures/GameObject/GameObjects/Player";
import BeastiaryClient from "../bot/BeastiaryClient";

export default class SpeciesInfoMessage extends InteractiveMessage {
    protected readonly lifetime = 30000;

    private readonly species: Species;
    private readonly player?: Player;
    
    private cardIndex = 0;
    private displayCard = true;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, species: Species, player?: Player) {
        super(channel, beastiaryClient);

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
        this.player = player;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const card = this.species.cards[this.cardIndex];

        embed.setColor(getGuildUserDisplayColor(this.beastiaryClient.discordClient.user, this.channel, this.beastiaryClient));

        if (this.displayCard) {
            buildSpeciesCard(embed, this.species, card);
        }
        else {
            buildSpeciesInfo(this.beastiaryClient.beastiary.emojis, embed, this.species, card, this.player);
        }

        embed.appendToFooter("\n" + this.getButtonHelpString());

        return embed;
    }

    protected async buttonPress(buttonName: string, user: User): Promise<void> {
        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing inherited button press behavior in a species info message.
                
                ${error}
            `);
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