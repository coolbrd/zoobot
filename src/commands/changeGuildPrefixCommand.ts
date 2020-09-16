import { GuildModel } from "../models/guild";
import CommandParser from "../utility/commandParser";
import { betterSend } from "../utility/toolbox";
import Command from "./commandInterface";

// Changes the command prefix for a given guild
export class ChangeGuildPrefixCommand implements Command {
    public readonly commandNames = ['prefix', 'changeprefix'];

    public help(prefix: string): string {
        return `Use ${prefix}prefix <new command prefix> to change the prefix that I respond to.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel.type === 'dm') {
            betterSend(parsedUserCommand.channel, 'This command can only be used in servers.');
            return;
        }

        const fullPrefix = parsedUserCommand.args.join(' ');

        if (!fullPrefix) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.commandPrefix));
            return;
        }

        const guild = parsedUserCommand.channel.guild;

        let guildDocument = await GuildModel.findOne({ guildID: guild.id });
        if (!guildDocument) {
            guildDocument = new GuildModel({
                guildID: guild.id,
                commandPrefix: '>'
            });
            try {
                await guildDocument.save();
            }
            catch (error) {
                console.error('There was an error trying to save a new guild model in the change prefix command.');
                throw new Error(error);
            }
        }

        try {
            await guildDocument.updateOne({
                commandPrefix: fullPrefix
            });
        }
        catch (error) {
            console.error('There was an error updating a guild model in the change prefix command.');
            throw new Error(error);
        }

        betterSend(parsedUserCommand.channel, `Success. My prefix is now "${fullPrefix}"`);
    }
}