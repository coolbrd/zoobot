import { MessageEmbed, TextChannel, User } from "discord.js";
import getGuildMember from "../discordUtility/getGuildMember";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../models/Animal";

export default class AnimalInfoMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    private readonly animalObject: Animal;
    private _ownerUser: User | undefined;
    private cardMode = false;

    constructor(channel: TextChannel, animalObject: Animal) {
        super(channel);

        this.addButtons([
            {
                name: "mode",
                emoji: "🖼️",
                helpMessage: "Toggle card view"
            }
        ]);

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
        try {
            await this.animalObject.loadFields();
        }
        catch (error) {
            throw new Error(`There was an error loading an animal object's data: ${error}`);
        }

        this.ownerUser = getGuildMember(this.animalObject.ownerId, this.animalObject.guildId).user;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();
    
        const userAvatar = this.ownerUser.avatarURL() || undefined;
        embed.setAuthor(`Belongs to ${this.ownerUser.username}`, userAvatar);
        
        if (!this.cardMode) {
            buildAnimalInfo(embed, this.animalObject);
        }
        else {
            buildAnimalCard(embed, this.animalObject);
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    protected buttonPress(_buttonName: string, _user: User): void {
        this.cardMode = !this.cardMode;
    }
}