import { InteractiveMessage, InteractiveMessageHandler } from "./interactiveMessage";
import { TextChannel, MessageEmbed, User } from "discord.js";
import { SmartEmbed } from "../utility/smartEmbed";
import { Animal } from "../models/animal";
import { Document } from "mongoose";
import { capitalizeFirstLetter } from "../utility/toolbox";

export class InventoryMessage extends InteractiveMessage {
    private readonly user: User;

    private readonly inventory: Document[] = [];

    private page = 0;
    private animalsPerPage = 10;

    public constructor(handler: InteractiveMessageHandler, channel: TextChannel, user: User) {
        super(handler, channel, { buttons: [
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

        // Get the user's inventory of animals in the current server
        Animal.find({ owner: this.user.id, server: channel.guild.id }).populate('species').exec((error, result) => {
            if (error) {
                console.error('There was an error finding a user\'s collection of animals.');
                return;
            }

            // Add each animal to the message's inventory as simple animal objects
            result.forEach(animal => {
                this.inventory.push(animal);
            });

            // Only build the embed after the inventory has been formed
            this.setEmbed(this.buildEmbed());
        });
    }

    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);

        if (this.inventory.length < 1) {
            return embed;
        }

        embed.setThumbnail(this.inventory[0].get('species').get('images')[this.inventory[0].get('image')].get('url'));

        let inventoryString = '';
        // Start the current page's display at the appropriate position
        let inventoryIndex = this.page * this.animalsPerPage;
        // Loop until either the index is above the entries per page limit or the length of the inventory
        while (inventoryIndex < this.page * this.animalsPerPage + this.animalsPerPage && inventoryIndex < this.inventory.length) {
            // Get the currently iterated animal in the user's inventory
            const animal = this.inventory[inventoryIndex];

            const species = animal.get('species');

            const firstName = species.get('commonNames')[0];

            const breed = species.get('images')[animal.get('image')].breed || undefined;
            const breedText = breed ? `(${breed})` : '';

            inventoryString += `\`${inventoryIndex + 1})\` ${capitalizeFirstLetter(firstName)} ${breedText}\n`;
            inventoryIndex++;
        }

        embed.setDescription(inventoryString);

        return embed;
    }

    public buttonPress(buttonName: string, user: User): void {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case 'leftArrow': {
                this.page--;
                break;
            }
            case 'rightArrow': {
                this.page++;
                break;
            }
        }

        this.setEmbed(this.buildEmbed());
    }
}