import InteractiveMessage from "./interactiveMessage";
import { TextChannel, MessageEmbed, User } from "discord.js";
import { SmartEmbed } from "../utility/smartEmbed";
import { Animal, AnimalObject } from "../models/animal";
import { capitalizeFirstLetter } from "../utility/toolbox";
import InteractiveMessageHandler from "./interactiveMessageHandler";

export class InventoryMessage extends InteractiveMessage {
    private readonly user: User;
    protected readonly channel: TextChannel;

    private readonly inventory: AnimalObject[] = [];

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
        this.channel = channel;
    }

    // Pre-send build logic
    public async build(): Promise<void> {
        super.build();

        // Get the user's inventory of animals in the current server
        const animalDocuments = await Animal.find({ owner: this.user.id, server: this.channel.guild.id });

        // Iterate over every document returned
        for (const animalDocument of animalDocuments) {
            // Convert the document to an object
            const animalObject = new AnimalObject(animalDocument);
            
            // Load the animal's species and image
            await animalObject.populateSpecies();
            await animalObject.populateImage();
            
            // Add the new animal object
            this.inventory.push(animalObject);
        }

        // If there's at least one animal in the user's inventory
        if (this.inventory.length > 0) {
            // Load that animal's image
            await this.inventory[0].populateImage();
        }

        // Only build the embed after the inventory has been formed
        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);

        if (this.inventory.length < 1) {
            return embed;
        }

        embed.setThumbnail(this.inventory[0].getImage().url);

        let inventoryString = '';
        // Start the current page's display at the appropriate position
        let inventoryIndex = this.page * this.animalsPerPage;
        // Loop until either the index is above the entries per page limit or the length of the inventory
        while (inventoryIndex < this.page * this.animalsPerPage + this.animalsPerPage && inventoryIndex < this.inventory.length) {
            // Get the currently iterated animal in the user's inventory
            const animal = this.inventory[inventoryIndex];

            const species = animal.getSpecies();

            const firstName = species.commonNames[0];

            const breed = animal.getImage().breed;
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