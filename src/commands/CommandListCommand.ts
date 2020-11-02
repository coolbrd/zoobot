import { APIMessage } from "discord.js";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import Command, { CommandSection } from "../structures/Command";
import { commandHandler } from "../structures/CommandHandler";
import CommandParser from "../structures/CommandParser";

// Sends an embed containing a list of all non-admin commands and their basic functions
export default class CommandListCommand extends Command {
    public readonly commandNames = ["commands", "commandlist", "listcommands", "command"];

    public readonly info = "View this message";

    public readonly section = CommandSection.info;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to get an overview of all commands and their functions.`;
    }

    public async run(parsedMessage: CommandParser): Promise<void> {
        let infoCommandString = "";
        let gettingStartedString = "";
        let playerInfoString = "";
        let animalManagementString = "";
        let guildManagementString = "";
        let getInvolvedString = "";
        
        for (const command of commandHandler.commands) {
            if (!command.adminOnly) {
                const infoString = `\`${command.commandNames[0]}\`: ${command.info}\n`;
                switch (command.section) {
                    case CommandSection.info: {
                        infoCommandString += infoString;
                        break;
                    }
                    case CommandSection.gettingStarted: {
                        gettingStartedString += infoString;
                        break;
                    }
                    case CommandSection.playerInfo: {
                        playerInfoString += infoString;
                        break;
                    }
                    case CommandSection.animalManagement: {
                        animalManagementString += infoString;
                        break;
                    }
                    case CommandSection.guildManagement: {
                        guildManagementString += infoString;
                        break;
                    }
                    case CommandSection.getInvolved: {
                        getInvolvedString += infoString;
                        break;
                    }
                }
            }
        }

        const embed = new SmartEmbed();

        embed.setTitle("Commands");
        embed.setDescription("Here's all the things I can do.");
        embed.addField("Info", infoCommandString, true);
        embed.addField("Getting started", gettingStartedString, true);
        embed.addField("Player info", playerInfoString, true);
        embed.addField("Animal management", animalManagementString, true);
        embed.addField("Server management", guildManagementString, true);
        embed.addField("Get involved!", getInvolvedString, true);
        embed.setFooter(`Prefix commands with "${commandHandler.getDisplayPrefixByMessage(parsedMessage.originalMessage)}", or by pinging me!`);
        embed.setColor(0x18476b);
        
        betterSend(parsedMessage.channel, new APIMessage(parsedMessage.channel, { embed: embed }));
    }
}