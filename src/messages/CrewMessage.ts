import { TextChannel, MessageEmbed } from "discord.js";
import { Player } from "../models/Player";
import { commandHandler } from "../structures/CommandHandler";
import AnimalDisplayMessage from "./AnimalDisplayMessage";

export default class CrewMessage extends AnimalDisplayMessage {
    protected readonly lifetime = 30000;

    protected readonly elementsPerPage = 10;

    private readonly player: Player;
    public readonly channel: TextChannel;

    constructor(channel: TextChannel, player: Player) {
        super(channel, player.crewAnimalIds, true, true);

        this.player = player;
        this.channel = channel;
    }

    // Builds the animal crew embed
    protected async buildEmbed(): Promise<MessageEmbed> {
        let embed: MessageEmbed;
        try {
            embed = await super.buildEmbed();
        }
        catch (error) {
            throw new Error(`There was an error building a crew message's inherited embed information: ${error}`);
        }

        // Make it more clear what we're working with here
        const crew = this.elements;

        const userAvatar = this.player.member.user.avatarURL() || undefined;
        embed.setAuthor(`${this.player.member.user.username}'s crew`, userAvatar);
        embed.setFooter(`${crew.length} in crew\n${this.getButtonHelpString()}`);

        // Don't try anything crazy if the user's crew is empty
        if (crew.length < 1) {
            embed.setDescription(`It's empty in here. Add animals to your crew with \`${commandHandler.getPrefixByGuild(this.channel.guild)}crewadd\`!`);
            return embed;
        }

        return embed;
    }
}