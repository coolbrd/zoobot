import { MessageEmbed, TextChannel } from "discord.js";
import config from "../config/BotConfig";
import Command, { CommandSection } from "../structures/Command/Command";
import PagedListMessage from "./PagedListMessage";

export default class CommandListMessage extends PagedListMessage<Command> {
    protected readonly lifetime = 180000;

    protected readonly elementsPerField = 10;
    protected readonly fieldsPerPage = 2;

    private readonly commandSections: CommandSection[] = [
        CommandSection.gettingStarted,
        CommandSection.info,
        CommandSection.gameplay,
        CommandSection.animalManagement,
        CommandSection.guildManagement,
        CommandSection.getInvolved
    ];

    protected formatElement(command: Command): string {
        return `\`${command.primaryName}\`: ${command.info}`;
    }

    protected formatFieldTitle(): string {
        return this.commandSections[this.page];
    }

    protected get pageCount(): number {
        return this.commandSections.length;
    }

    protected get visibleElements(): Command[] {
        return this.beastiaryClient.commandHandler.baseCommands.filter(command => command.sections && command.sections.includes(this.commandSections[this.page]));
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = await super.buildEmbed();

        embed.setTitle("Command list");
        embed.setDescription("Here's a paged list of all the things I can do. Use the reaction emojis to navigate sections.");

        let prefix: string;
        if (this.channel instanceof TextChannel) {
            prefix = this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild);
        }
        else {
            prefix = config.prefix;
        }
        
        const prefixHelpString = `Prefix commands with "${prefix}", or by pinging me!`;
        const footerText = embed.footer ? embed.footer.text : "";
        const reactionInfoString = "Reactions not showing up? You may need to ensure that I have permission to react to messages in this channel.";
        embed.setFooter(prefixHelpString + "\n" + footerText + "\n" + reactionInfoString);

        return embed;
    }
}