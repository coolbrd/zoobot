import { MessageEmbed, TextChannel, User } from "discord.js";

import getGuildMember from "../discordUtility/getGuildMember";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../models/Animal";

// Displays a single animal's basic info and card
export default class AnimalInfoMessage extends InteractiveMessage {
    private readonly animalObject: Animal;

    // The user instance associated with the player that owns the displayed animal
    private _ownerUser: User | undefined;

    // Whether or not this message is showing the animal's card
    private cardMode = false;

    constructor(channel: TextChannel, animalObject: Animal) {
        super(channel, { buttons: [
            {
                name: "mode",
                emoji: "🖼️",
                helpMessage: "toggle card view"
            }
        ]});

        this.animalObject = animalObject;
    }

    private get ownerUser(): User {
        if (!this._ownerUser) {
            throw new Error("An animal info message attempted to access the animal's owner's user before it was found.");
        }

        return this._ownerUser;
    }

    private set ownerUser(ownerUser: User) {
        this._ownerUser = ownerUser;
    }

    public async build(): Promise<void> {
        // Load the animal's information
        try {
            await this.animalObject.load();
        }
        catch (error) {
            throw new Error(`There was an error loading an animal object's data: ${error}`);
        }

        // Get the owner's user instance
        this.ownerUser = getGuildMember(this.animalObject.ownerId, this.animalObject.guildId).user;

        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();
    
        const userAvatar = this.ownerUser.avatarURL() || undefined;
        embed.setAuthor(`Belongs to ${this.ownerUser.username}`, userAvatar);

        // Build the message according to what mode it's in
        if (!this.cardMode) {
            buildAnimalInfo(embed, this.animalObject);
        }
        else {
            buildAnimalCard(embed, this.animalObject);
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    // Toggle mode on button press
    public async buttonPress(_buttonName: string, _user: User): Promise<void> {
        this.cardMode = !this.cardMode;

        this.setEmbed(this.buildEmbed());
    }
}