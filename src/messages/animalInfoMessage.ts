import { MessageEmbed, TextChannel, User } from "discord.js";
import getGuildMember from "../discordUtility/getGuildMember";
import SmartEmbed from "../discordUtility/smartEmbed";
import buildAnimalImage from "../embedBuilders/buildAnimalImage";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { AnimalObject } from "../models/animal";

// Displays a single animal's basic info and image
export default class AnimalInfoMessage extends InteractiveMessage {
    private readonly animalObject: AnimalObject;

    // The user instance associated with the player that owns the displayed animal
    private ownerUser: User | undefined;

    // Whether or not this message is showing the animal's image
    private imageMode = false;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel, animalObject: AnimalObject) {
        super(handler, channel, { buttons: [
            {
                name: 'mode',
                emoji: '🖼️',
                helpMessage: 'toggle image view'
            }
        ]});

        this.animalObject = animalObject;
    }

    private getOwnerUser(): User {
        if (!this.ownerUser) {
            throw new Error('An animal info message attempted to access the animal\'s owner\'s user before it was found.');
        }

        return this.ownerUser;
    }

    public async build(): Promise<void> {
        // Load the animal's information
        await this.animalObject.load();

        // Get the owner's user instance
        this.ownerUser = getGuildMember(this.animalObject.getOwnerId(), this.animalObject.getGuildId()).user;

        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();
    
        const userAvatar = this.getOwnerUser().avatarURL() || undefined;
        embed.setAuthor(`Belongs to ${this.getOwnerUser().username}`, userAvatar);

        // Build the message according to what mode it's in
        if (!this.imageMode) {
            buildAnimalInfo(embed, this.animalObject);
        }
        else {
            buildAnimalImage(embed, this.animalObject);
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    // Toggle mode on button press
    public async buttonPress(_buttonName: string, _user: User): Promise<void> {
        this.imageMode = !this.imageMode;

        this.setEmbed(this.buildEmbed());
    }
}