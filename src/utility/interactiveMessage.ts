import { Message, TextChannel } from "discord.js";

// A message with pressable reaction buttons that can be assigned to do things
export default class InteractiveMessage {
    // The map of button emojis and their functions
    readonly buttons: Map<string, Function>;

    // This interactive message's underlying message
    private message: Message | undefined;

    constructor(buttons: Map<string, Function>) {
        this.buttons = buttons;
    }

    // Get this interactive message's underlying Discord message
    getMessage() {
        return this.message as Message;
    }

    // Send this interactive message and set it up
    async send(channel: TextChannel) {
        // Send the message's content
        this.message = await channel.send("UFO landing site");
        // Iterate over every button's emoji
        for (let emoji of this.buttons.keys()) {
            // Add a reaction for every button
            await this.message.react(emoji);
        }
    }

    // Activates this message's button that corresponds to a given emoji. Does nothing if the emoji is not a valid button
    async buttonPress(button: string) {
        // Get the potential function to activate based on the button pressed
        const action = this.buttons.get(button);
        // If an action was found, execute it
        action && action();
    }
}