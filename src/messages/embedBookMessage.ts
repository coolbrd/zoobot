import { DMChannel, MessageEmbed, TextChannel, User } from 'discord.js';

import InteractiveMessage from '../interactiveMessage/interactiveMessage';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';
import { loopValue } from '../utility/toolbox';

// A message that allows an array of embeds to be linearly browsed
export default class EmbedBookMessage extends InteractiveMessage {
    // The book of embeds
    private readonly book: MessageEmbed[];
    // The current index of the book to display
    private page: number;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, book: MessageEmbed[]) {
        super(handler, channel, { buttons: [
            {
                name: 'pageLeft',
                emoji: '⬅️',
                helpMessage: 'Go back one page'
            },
            {
                name: 'pageRight',
                emoji: '➡️',
                helpMessage: 'Go forward one page'
            }
        ]});
        this.book = book;
        this.page = 0;

        this.setEmbed(this.getPage(this.page));
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        // Make sure the timer is reset whenever a button is pressed
        super.buttonPress(buttonName, user);

        switch(buttonName) {
            case 'pageLeft': {
                this.goToPage(this.page - 1);
                break;
            }
            case 'pageRight': {
                this.goToPage(this.page + 1);
                break;
            }
        }
    }

    private getPage(page: number): MessageEmbed {
        return this.book[page].setFooter(`Page ${page + 1}/${this.book.length}`);
    }

    // Takes a number and goes to that index of the message's embed book
    // Loops back to 0 if the resulting index is greater than the last page, and loops to the last page if the index is less than 0
    private async goToPage(newPage: number): Promise<void> {
        // Apply proper page looping
        newPage = loopValue(newPage, 0, this.book.length - 1);

        // Get the next page and add its info to the footer
        const nextPage = this.getPage(newPage);

        try {
            // Update the message
            this.setEmbed(nextPage);
        }
        catch (error) {
            console.error(`Unable to edit embed book message.`, error);
            return;
        }

        // The page turn was successful, so assign the new page
        this.page = newPage;
    }
}