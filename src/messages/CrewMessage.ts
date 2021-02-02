import { TextChannel, MessageEmbed } from "discord.js";
import { Player } from "../structures/GameObject/GameObjects/Player";
import AnimalDisplayMessage from "./AnimalDisplayMessage";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import CrewCommand from "../commands/Crew/CrewCommand";
import CrewAddSubCommand from "../commands/Crew/CrewAddSubCommand";

export default class CrewMessage extends AnimalDisplayMessage {
    protected readonly lifetime = 30000;

    protected readonly fieldsPerPage = 1;
    protected readonly elementsPerField = 10;

    protected readonly numbered = false;

    private readonly player: Player;
    public readonly channel: TextChannel;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient, player.crewAnimals);

        this.player = player;
        this.channel = channel;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = await super.buildEmbed();

        const crew = this.elements;

        const userAvatar = this.player.avatarURL;

        embed.setAuthor(`${this.player.username}'s crew`, userAvatar);
        embed.setFooter(stripIndent`
            ${crew.length} in crew
            ${this.getButtonHelpString()}
        `);

        if (crew.length < 1) {
            const guildPrefix = this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild);
            embed.setDescription(`It's empty in here. Add animals to your crew with \`${guildPrefix}${CrewCommand.primaryName}\` \`${CrewAddSubCommand.primaryName}\`!`);
            return embed;
        }

        return embed;
    }
}