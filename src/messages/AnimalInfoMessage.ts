import { stripIndent } from "common-tags";
import { GuildMember, MessageEmbed, TextChannel, User } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import getGuildMember from "../discordUtility/getGuildMember";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../structures/GameObject/GameObjects/Animal";

export default class AnimalInfoMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    private readonly animalObject: Animal;
    private _ownerUser: User | undefined;
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

    private get ownerUser(): User {
        if (!this._ownerUser) {
            throw new Error(stripIndent`
                An animal info message attempted to access the animal's owner's user before it was found.

                Info message: ${this.debugString}
            `);
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
            throw new Error(stripIndent`
                There was an error loading an animal object's data.

                Animal: ${this.animalObject.debugString}
                
                ${error}
            `);
        }

        let guildMember: GuildMember | undefined;
        try {
            guildMember = await getGuildMember(this.animalObject.userId, this.animalObject.guildId, this.beastiaryClient);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a guild member by a player's information.

                User id: ${this.animalObject.userId}
                Guild id: ${this.animalObject.guildId}

                ${error}
            `);
        }

        if (!guildMember) {
            throw new Error(stripIndent`
                No guild member could be found according to an animal's owner information.

                User id: ${this.animalObject.userId}
                Guild id: ${this.animalObject.guildId}
            `);
        }

        this._ownerUser = guildMember.user;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();
    
        const userAvatar = this.ownerUser.avatarURL() || undefined;
        embed.setAuthor(`Belongs to ${this.ownerUser.username}`, userAvatar);
        
        if (!this.cardMode) {
            buildAnimalInfo(embed, this.animalObject, this.beastiaryClient.beastiary.emojis);
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