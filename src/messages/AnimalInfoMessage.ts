import { stripIndent } from "common-tags";
import { MessageEmbed, TextChannel, User } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../structures/GameObject/GameObjects/Animal";

export default class AnimalInfoMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    private readonly animalObject: Animal;
    private cardMode = false;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, animalObject: Animal) {
        super(channel, beastiaryClient);

        this.addButtons([
            {
                name: "mode",
                emoji: "🖼️",
                helpMessage: "Toggle card view"
            }
        ]);

        this.animalObject = animalObject;
    }

    public async build(): Promise<void> {
        try {
            await this.animalObject.loadFields();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading an animal object's data.

                Animal: ${this.animalObject.debugString}
                
                ${error}
            `);
        }
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();
    
        if (this.animalObject.owner) {
            const userAvatar = this.animalObject.owner.avatarURL;
            embed.setAuthor(`Belongs to ${this.animalObject.owner.username}`, userAvatar);
        }
        
        if (!this.cardMode) {
            buildAnimalInfo(embed, this.animalObject);
        }
        else {
            buildAnimalCard(embed, this.animalObject);
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    protected async buttonPress(_buttonName: string, _user: User): Promise<void> {
        this.cardMode = !this.cardMode;
    }
}