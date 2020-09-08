import { InteractiveMessage } from "./interactiveMessage";
import { TextChannel, DMChannel, MessageEmbed, User } from "discord.js";
import { SmartEmbed } from "../utility/smartEmbed";
import { Animal, AnimalObject } from "../models/animal";

export class InventoryMessage extends InteractiveMessage {
    private readonly user: User;

    private readonly inventory: AnimalObject[] = [];

    private page = 0;

    public constructor(channel: TextChannel | DMChannel, user: User) {
        super(channel, { buttons: [
            {
                name: 'leftArrow',
                emoji: '⬅️'
            },
            {
                name: 'rightArrow',
                emoji: '➡️'
            },
            {
                name: 'info',
                emoji: 'ℹ️'
            }
        ]});

        this.user = user;

        // Get the user's inventory of animals
        Animal.find({ owner: this.user.id }, (error, result) => {
            if (error) {
                console.error('There was an error finding a user\'s collection of animals.');
                return;
            }

            // Add each animal to the message's inventory as simple animal objects
            result.forEach(animal => {
                this.inventory.push(animal.toObject() as AnimalObject);
            });

            // Only build the embed after the inventory has been formed
            this.setEmbed(this.buildEmbed());
        });
    }

    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();

        embed.setTitle(`${this.user.username}'s collection.`);

        return embed;
    }
}