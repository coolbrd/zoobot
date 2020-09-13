import { TextChannel, MessageEmbed, User } from "discord.js";

import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import { SmartEmbed } from "../utility/smartEmbed";
import { Animal, AnimalObject } from "../models/animal";
import { bulkPopulate, capitalizeFirstLetter, loopValue } from "../utility/toolbox";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";

export class InventoryMessage extends InteractiveMessage {
    private readonly user: User;
    protected readonly channel: TextChannel;

    private readonly inventory: AnimalObject[] = [];

    private page = 0;
    private animalsPerPage = 10;
    private pageCount = 0;

    private pointerPosition = 0;

    private infoMode = false;

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
                name: 'upArrow',
                emoji: '⬆️'
            },
            {
                name: 'downArrow',
                emoji: '⬇️'
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

        const animalDocuments = await Animal.find({ owner: this.user.id, server: this.channel.guild.id });

        // Add every animal document to the inventory as a simpler object
        animalDocuments.forEach(animalDocument => {
            this.inventory.push(new AnimalObject(animalDocument));
        });

        // Calculate and set page count
        this.pageCount = Math.ceil(this.inventory.length / this.animalsPerPage);

        this.setEmbed(await this.buildEmbed());
    }

    // Build's the current page of the inventory's embed
    // Is async because queries for each animal's species data are being made as requested, rather than initially
    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const userAvatar = this.user.avatarURL() || undefined;
        embed.setAuthor(`${this.user.username}'s collection`, userAvatar);

        // Don't try anything crazy if the user's inventory is empty
        if (this.inventory.length < 1) {
            return embed;
        }

        // Calculate the start and end points of the current page
        const startIndex = this.page * this.animalsPerPage;
        const endIndex = startIndex + this.animalsPerPage;

        // The array that will hold the asynchronous functions to execute in bulk
        const unloadedAnimals: AnimalObject[] = this.inventory.slice(startIndex, endIndex).filter(animal => {
            // Only fill the array with animal's that haven't been loaded yet
            return !animal.populated();
        });
        
        // Load the unloaded animals if there are any
        unloadedAnimals.length && await bulkPopulate(unloadedAnimals);

        // When the inventory message is showing an overview of all animals
        if (!this.infoMode) {
            embed.setThumbnail(this.inventory[0].getImage().url);

            let inventoryString = '';
            // Start the current page's display at the appropriate position
            let inventoryIndex = startIndex;
            // Loop until either the index is above the entries per page limit or the length of the inventory
            while (inventoryIndex < endIndex && inventoryIndex < this.inventory.length) {
                // Get the currently iterated animal in the user's inventory
                const animal = this.inventory[inventoryIndex];

                const species = animal.getSpecies();
                const image = animal.getImage();

                const firstName = species.commonNames[0];

                const breed = image.breed;
                const breedText = breed ? `(${breed})` : '';

                // The pointer text to draw on the current animal entry (if any)
                const pointerText = inventoryIndex === this.pointerPosition ? ' 🔹' : '';

                inventoryString += `\`${inventoryIndex + 1})\` ${capitalizeFirstLetter(firstName)} ${breedText}${pointerText}\n`;
                inventoryIndex++;
            }

            embed.setDescription(inventoryString);
        }
        // When the inventory message is displaying information about a specific animal
        else {
            const selectedAnimal = this.inventory[this.pointerPosition];
            const species = selectedAnimal.getSpecies();
            const image = selectedAnimal.getImage();

            embed.setThumbnail(image.url);

            embed.setTitle(`${capitalizeFirstLetter(species.commonNames[0])}`);
            
            embed.addField('Species', species.scientificName, true);

            const imageIndex = species.images.findIndex(image => {
                return image._id.equals(image._id);
            });
            embed.addField('Image', `${imageIndex + 1}/${species.images.length}`, true);
        }

        return embed;
    }

    // Move a number of pages
    private movePages(count: number): void {
        // Moves the desired number of pages, looping if necessary
        this.page = loopValue(this.page + count, 0, this.pageCount - 1);
        // If the page move caused the pointer to be off the page
        if (!this.pointerIsOnPage()) {
            // Move the pointer to the first entry on the page
            this.pointerPosition = this.page * this.animalsPerPage;
        }
    }

    // Gets the page that the pointer is currently on
    private getPointerPage(): number {
        return Math.floor(this.pointerPosition / this.animalsPerPage);
    }

    // Checks if the pointer is on the message's currently displayed page
    private pointerIsOnPage(): boolean {
        return this.page === this.getPointerPage();
    }

    // Moves to the page that the pointer is on
    private goToPointerPage(): void {
        this.page = this.getPointerPage();
    }

    // Moves the pointer a number of positions
    private movePointer(count: number): void {
        // Move the pointer, looping end-to-end if necessary
        this.pointerPosition = loopValue(this.pointerPosition + count, 0, this.inventory.length - 1);
        // If moving the pointer made it leave the page
        if (!this.pointerIsOnPage()) {
            // Change the page to the one that the pointer's on
            this.goToPointerPage();
        }
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case 'upArrow': {
                this.movePointer(-1);
                break;
            }
            case 'downArrow': {
                this.movePointer(1);
                break;
            }
            case 'leftArrow': {
                this.movePages(-1);
                break;
            }
            case 'rightArrow': {
                this.movePages(1);
                break;
            }
            case 'info': {
                this.infoMode = !this.infoMode;
                break;
            }
        }

        this.setEmbed(await this.buildEmbed());
    }
}