import { GuildCommandParser } from "../structures/Command/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { commandHandler } from "../structures/Command/CommandHandler";
import { beastiary } from "../beastiary/Beastiary";

export default class ChangeGuildPrefixCommand extends GuildCommand {
    public readonly commandNames = ["prefix", "changeprefix"];

    public readonly info = "Change the prefix I respond to";

    public readonly section = CommandSection.guildManagement;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<new command prefix>\` to change the prefix that I respond to.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        const prefix = parsedMessage.fullArguments;

        if (!prefix) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        let guildObject: PlayerGuild;
        try {
            guildObject = await beastiary.playerGuilds.fetchByGuildId(parsedMessage.guild.id);
        }
        catch (error) {
            throw new Error(`There was an error attempting to get a guild object from a guild id: ${error}`);
        }

        guildObject.prefix = prefix;

        commandHandler.changeGuildPrefix(guildObject.guildId, prefix);

        betterSend(parsedMessage.channel, `Success. My prefix is now \`${prefix}\`.`);
    }
}