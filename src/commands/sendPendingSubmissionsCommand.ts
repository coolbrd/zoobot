import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { betterSend, capitalizeFirstLetter } from '../utility/toolbox';
import { PendingSpecies } from '../models/pendingSpecies';
import { MessageEmbed, APIMessage, DMChannel, TextChannel, Message, User } from 'discord.js';
import { client } from '..';
import { InteractiveMessage } from '../utility/interactiveMessage';
//import { ADMIN_SERVER_ID } from '../config/secrets';

export class SendPendingSubmissionsCommand implements Command {
    commandNames = [`pending`, `submissions`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}pending to view a list of all pending species submissions.`;
    }

    async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.originalMessage.channel as TextChannel | DMChannel;
        const guild = parsedUserCommand.originalMessage.guild;

        if (!guild /*|| guild.id !== ADMIN_SERVER_ID*/) {
            betterSend(channel, `This command can only be used in the designated admin server. Try it there.`);
            return;
        }

        // Get all pending species documents
        const pendingSpecies = await PendingSpecies.find({}, { commonNames: 1, author: 1, _id: 0 });

        // The array of embeds that will represent a paged form of all pending species
        const embedBook: MessageEmbed[] = [];
        let currentEmbedPage: MessageEmbed;
        // The currently iterated pending species (starting at 1 because the modulo operator doesn't use 0 the way I want it to)
        let submissionIndex = 1;
        // The content of the current page that's being built
        let currentPageString = ``;
        // The number of pending species that will appear on each page
        const entriesPerPage = 10;
        // Iterate over every pending species submission in the database
        for (const submission of pendingSpecies) {
            // Get the author's id
            const authorID = submission.get(`author`);
            // Try to resolve the author's id into their user instance
            const author = client.users.resolve(authorID);
            // Add basic info about this submission to the page
            currentPageString += `• ${capitalizeFirstLetter(submission.get(`commonNames`)[0])}, by ${author ? author.tag : `Unknown user`}\n`

            // If the limit of entried per page has been reached, or we're at the end of the set of documents
            if (submissionIndex % entriesPerPage == 0 || submissionIndex == pendingSpecies.length) {
                // Create a new embed and build it according to the present information
                currentEmbedPage = new MessageEmbed();
                currentEmbedPage.setTitle(`Species submissions pending approval`);
                currentEmbedPage.setDescription(currentPageString);

                // Add the page to the book
                embedBook.push(currentEmbedPage);
                currentPageString = ``;
            }
            
            submissionIndex++;
        }

        EmbedBookMessage.init(channel, embedBook);
    }
}

// A message that allows an array of embeds to be linearly browsed
class EmbedBookMessage extends InteractiveMessage {
    // The book of embeds
    readonly book: MessageEmbed[];
    // The current index of the book to display
    private page = 0;

    protected constructor(message: Message, buttons: string[], lifetime: number, book: MessageEmbed[]) {
        super(message, buttons, lifetime);
        this.book = book;
    }

    static async init(channel: TextChannel | DMChannel, book: MessageEmbed[]): Promise<EmbedBookMessage> {
        const buttons = [`⬅️`, `➡️`];
        const lifetime = 30000;

        // Create the first message that will contain the first page of the book
        const content = new APIMessage(channel, { embed: this.getPage(book, 0) });

        let message;
        try {
            // Attempt to send and build the message
            message = await this.build(content, channel, buttons) as Message;
        }
        catch (error) {
            throw new Error(`Error building the base message for an embed book message.`);
        }

        // Return a new instance of an interactive embed book
        return new EmbedBookMessage(message, buttons, lifetime, book);
    }

    async buttonPress(button: string, user: User): Promise<void> {
        // Make sure the timer is reset whenever a button is pressed
        super.buttonPress(button, user);

        switch(button) {
            case `⬅️`: {
                this.goToPage(this.page - 1);
                break;
            }
            case `➡️`: {
                this.goToPage(this.page + 1);
                break;
            }
        }
    }

    private static getPage(book: MessageEmbed[], page: number): MessageEmbed {
        return book[page].setFooter(`Page ${page + 1}/${book.length}`);
    }

    // Takes a number and goes to that index of the message's embed book
    // Loops back to 0 if the resulting index is greater than the last page, and loops to the last page if the index is less than 0
    private async goToPage(newPage: number): Promise<void> {
        // Check for and apply looping
        if (newPage >= this.book.length) {
            newPage = 0;
        }
        else if (newPage < 0) {
            newPage = this.book.length - 1;
        }
        // If the page didn't end up changing
        if (newPage === this.page) {
            // Don't change anything
            return;
        }
        // If we're down here it means the page needs to be changed

        try {
            // Get the next page and add its info to the footer
            const nextPage = EmbedBookMessage.getPage(this.book, newPage);
            // Edit the message to contain the next page
            await this.getMessage().edit(nextPage);
        }
        catch (error) {
            console.error(`Unable to edit embed book message.`, error);
            return;
        }

        // The page turn was successful, so assign the new page
        this.page = newPage;
    }

    protected async deactivate(): Promise<void> {
        // Inherit parent deactivation behavior
        super.deactivate();

        const embed = this.getMessage().embeds[0];

        // Get the embed's footer
        const footer = embed.footer;

        // If for some reason there isn't a footer
        if (!footer) {
            console.error(`Empty footer returned from encounter message.`);
            return;
        }

        const newEmbed = embed.setFooter(`${footer.text} (deactivated)`);

        try {
            // Update the message
            await this.getMessage().edit(newEmbed);
        }
        catch (error) {
            console.error(`Error trying to edit an embed on an interactive message.`, error);
        }
    }
}