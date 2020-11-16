import { TextChannel, MessageEmbed, User } from "discord.js";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { commandHandler } from "../structures/Command/CommandHandler";
import AnimalDisplayMessage, { AnimalDisplayMessageState } from "./AnimalDisplayMessage";
import { stripIndents } from "common-tags";

export default class CollectionMessage extends AnimalDisplayMessage {
    protected readonly lifetime = 90000;

    protected readonly elementsPerPage = 10;
    
    private readonly player: Player;
    public readonly channel: TextChannel;

    constructor(channel: TextChannel, player: Player) {
        super(channel, player.getCollectionAsLoadableAnimals());

        this.player = player;
        this.channel = channel;
    }

    public async build(): Promise<void> {
        try {
            await super.build();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error building an animal display message's inherited information.

                Collection message: ${this.debugString}
                
                ${error}
            `);
        }

        if (this.elements.length > 0) {
            this.addButton({
                emoji: "Ⓜ️",
                name: "mode",
                helpMessage: "View mode"
            });
        }
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        let embed: MessageEmbed;
        try {
            embed = await super.buildEmbed();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error building a collection message's inherited embed information.

                Collection message: ${this.debugString}
                
                ${error}
            `);
        }

        const collection = this.elements;

        const userAvatar = this.player.member.user.avatarURL() || undefined;
        embed.setAuthor(`${this.player.member.user.username}'s collection`, userAvatar);
        embed.setFooter(`${collection.length} in collection (max ${this.player.collectionSizeLimit})\n${this.getButtonHelpString()}`);

        if (collection.length < 1) {
            embed.setDescription(`It's empty in here. Try catching an animal with \`${commandHandler.getPrefixByGuild(this.channel.guild)}encounter\`!`);
            return embed;
        }

        if (this.state === AnimalDisplayMessageState.info || this.state === AnimalDisplayMessageState.card) {
            embed.setTitle(`\`${collection.pointerPosition + 1})\` ${embed.title}`);
        }

        return embed;
    }

    protected async buttonPress(buttonName: string, user: User): Promise<void> {
        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error performing inherited button behavior in a collection message.
                
                ${error}
            `);
        }

        switch (buttonName) {
            case "mode": {
                switch (this.state) {
                    case AnimalDisplayMessageState.page: {
                        this.state = AnimalDisplayMessageState.info;
                        break;
                    }
                    case AnimalDisplayMessageState.info: {
                        this.state = AnimalDisplayMessageState.card;
                        break;
                    }
                    case AnimalDisplayMessageState.card: {
                        this.state = AnimalDisplayMessageState.page;
                        break;
                    }
                }
                break;
            }
        }
    }
}