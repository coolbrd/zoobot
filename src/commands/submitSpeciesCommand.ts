import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { Message } from 'discord.js';
import { stripIndents } from 'common-tags';
import Species from '../zoo/species';

export class SubmitSpeciesCommand implements Command {
    commandNames = [`submitspecies`, `submit`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}submit to begin the species submission process.`;
    }

    async run(parsedUserCommand: CommandParser) {
        try {
            await parsedUserCommand.originalMessage.channel.send(stripIndents`
                Submission process initiated. You will have 60 seconds to respond to each individual prompt. Pre-writing these answers in another document and copying them over is highly reccomended.
                Field 1: **Common name(s)**
                Enter the animal's **primary common name** (e.g. "dog"):
            `);
        }
        catch(error) {
            console.error(`Error trying to send a DM message during animal submission.`, error);
            return;
        }

        const filter = (response: Message) => {
            return response.author === parsedUserCommand.originalMessage.author;
        };
        const messageCollectorOptions = { max: 1, time: 60000, errors: [`time`] };

        let userResponse;
        try {
            userResponse = await parsedUserCommand.originalMessage.channel.awaitMessages(filter, messageCollectorOptions);
        }
        catch {
            try {
                await parsedUserCommand.originalMessage.channel.send(`Time limit expired, submission aborted.`);
            }
            catch(error) {
                console.error(`Error trying to send a message after no messages were collected for a submission command.`, error);
                return;
            }
            return;
        }

        if (!userResponse) {
            throw new Error(`User response object returned from message collector is undefined.`);
        }

        const responseMessage = userResponse.first();
        if (!responseMessage) {
            throw new Error(`Message collector came back empty.`);
        }

        const commonNames: string[] = [];
        commonNames.push(responseMessage.content);

        try {
            parsedUserCommand.originalMessage.channel.send(stripIndents`
                Primary common name: **${commonNames[0]}**
                Field 1 (cont): Enter another common name, or enter "next" to continue to the next field.
            `);
        }
        catch(error) {
            console.error(`Error trying to send a message after receiving first argument of animal submission command.`, error);
            return;
        }
    }
}