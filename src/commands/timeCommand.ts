import Command from './commandInterface';
import CommandParser from '../utility/commandParser';

// Returns the bot's current local time
export class TimeCommand implements Command {
    commandNames = [`time`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}time to current time.`;
    }

    async run(parsedUserCommand: CommandParser): Promise<void> {
        const now = new Date();
        try {
            await parsedUserCommand.originalMessage.channel.send(`It is currently ${now.getHours()}:${now.getMinutes()}.`);
        }
        catch(error) {
            console.error(`Error sending time command response.`, error);
        }
    }
}