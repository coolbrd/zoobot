import { DMChannel, MessageEmbed, Message, TextChannel, APIMessage, User } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';

// A message that allows an array of embeds to be linearly browsed
export default class EmbedBookMessage extends InteractiveMessage {
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

        // Append the deactivated info to the end of the message's footer
        const newEmbed = embed.setFooter(`${footer ? `${footer.text} ` : ``}(deactivated)`);

        try {
            // Update the message
            await this.getMessage().edit(newEmbed);
        }
        catch (error) {
            console.error(`Error trying to edit an embed on an interactive message.`, error);
        }
    }
}