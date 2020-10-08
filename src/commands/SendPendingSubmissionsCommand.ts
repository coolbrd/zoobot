import { MessageEmbed } from 'discord.js';

import Command from '../structures/CommandInterface';
import CommandParser from '../structures/CommandParser';
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import { betterSend } from "../discordUtility/messageMan";
import { PendingSpecies } from '../models/PendingSpecies';
import EmbedBookMessage from '../messages/EmbedBookMessage';
import { Document } from 'mongoose';
import { errorHandler } from '../structures/ErrorHandler';
import { client } from '..';

export default class SendPendingSubmissionsCommand implements Command {
    public readonly commandNames = ['pending', 'submissions'];

    public readonly adminOnly = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}pending\` to view a list of all pending species submissions.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;

        let pendingSpecies: Document[];
        // Get all pending species documents
        try {
            pendingSpecies = await PendingSpecies.find({}, { commonNames: 1, author: 1, _id: 0 });
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error finding all species pending approval.');
            return;
        }

        // Don't send an empty embed if there are no pending species
        if (pendingSpecies.length < 1) {
            betterSend(channel, 'There are currently no species pending approval.');
            return;
        }

        // The array of embeds that will represent a paged form of all pending species
        const embedBook: MessageEmbed[] = [];
        let currentEmbedPage: MessageEmbed;

        // The currently iterated pending species (starting at 1 because the modulo operator doesn't use 0 the way I want it to)
        let submissionIndex = 1;
        // The content of the current page that's being built
        let currentPageString = '';

        // The number of pending species that will appear on each page
        const entriesPerPage = 10;
        // Iterate over every pending species submission in the database
        for (const submission of pendingSpecies) {
            // Get the author's ID
            const authorId = submission.get('author');
            // Try to resolve the author's ID into their user instance
            const author = client.users.resolve(authorId);
            
            // Add basic info about this submission to the page
            currentPageString += `• ${capitalizeFirstLetter(submission.get('commonNames')[0])}, by ${author ? author.tag : 'Unknown user'}\n`

            // If the limit of entried per page has been reached, or we're at the end of the set of documents
            if (submissionIndex % entriesPerPage == 0 || submissionIndex == pendingSpecies.length) {
                // Create a new embed and build it according to the present information
                currentEmbedPage = new MessageEmbed();
                currentEmbedPage.setTitle('Species submissions pending approval');
                currentEmbedPage.setDescription(currentPageString);

                // Add the page to the book
                embedBook.push(currentEmbedPage);
                currentPageString = '';
            }
            
            submissionIndex++;
        }

        // Send the embed book
        const embedBookMessage = new EmbedBookMessage(channel, embedBook);
        try {
            await embedBookMessage.send();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error sending a new embed book message.');
        }
    }
}