import { Message } from 'discord.js';

// The parsed version of a command given by a user`s message
export default class CommandParser {
    // The parsed name of the command that`s being used in the message, even if it`s not a valid command
    readonly parsedCommandName: string;
    // The array of text following the command, split by spaces
    readonly args: string[];
    // The message as originally sent by the user
    readonly originalMessage: Message;
    // The prefix used by the command handler
    readonly commandPrefix: string;

    // Initialization required the user`s message and the prefix to cut out
    constructor(message: Message, prefix: string) {
        // Assign this instance`s prefix to that which was supplied
        this.commandPrefix = prefix;
        
        // Remove the message`s prefix, split it by spaces, and store it in an array
        const splitMessage = message.content.slice(prefix.length).trim().split(` `);
        // Remove the initial command from the message`s array and store it in its own variable
        // Short-circuit to ensure that even if undefined is returned from the shift method, an empty string will be used
        const commandName = splitMessage.shift() || ``;
        
        // Tranform the command name used to lowercase and assign it to this instance
        this.parsedCommandName = commandName.toLowerCase();
        // Assign the split up message to this instance as the command`s supplied arguments
        this.args = splitMessage;
        // Assign the original message to this instance
        this.originalMessage = message;
    }
}