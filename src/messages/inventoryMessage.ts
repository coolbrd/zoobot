import { TextChannel, MessageEmbed, User } from "discord.js";

import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import { SmartEmbed } from "../utility/smartEmbed";
import { Animal, AnimalObject } from "../models/animal";
import { capitalizeFirstLetter, loopValue } from "../utility/toolbox";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { resolve } from "path";

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
    public build(): Promise<void> {
        super.build();

        // Return the promise that will resolve only once the inventory is fully built
        return new Promise(resolve => {
            // Get the user's inventory of animals in the current server
            Animal.find({ owner: this.user.id, server: this.channel.guild.id }).then(animalDocuments => {
                // Iterate over every document returned
                for (const animalDocument of animalDocuments) {
                    // Convert the document to an object
                    const animalObject = new AnimalObject(animalDocument);

                    // Add the new animal object
                    this.inventory.push(animalObject);
                    
                    // Load the animal's species and image
                    animalObject.populateImage().then(() => {
                        // When one animal finishes loading its info, check if all of them are done
                        const allLoaded = !this.inventory.some(animal => {
                            return !animal.imageLoaded();
                        });

                        // If all animals are loaded
                        if (allLoaded) {
                            // Only build the embed after the inventory has been formed
                            this.setEmbed(this.buildEmbed());

                            // Resolve the promies
                            resolve();
                        }
                    });
                }

                // Calculate and set page count
                this.pageCount = Math.ceil(this.inventory.length / this.animalsPerPage);
            });
        });
    }

    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();

            const userAvatar = this.user.avatarURL() || undefined;
            embed.setAuthor(`${this.user.username}'s collection`, userAvatar);

            if (this.inventory.length < 1) {
                return embed;
            }

        if (!this.infoMode) {
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

                const pointerText = inventoryIndex === this.pointerPosition ? ' 🔹' : '';

                inventoryString += `\`${inventoryIndex + 1})\` ${capitalizeFirstLetter(firstName)} ${breedText}${pointerText}\n`;
                inventoryIndex++;
            }

            embed.setDescription(inventoryString);
        }
        else {
            const selectedAnimal = this.inventory[this.pointerPosition];

            embed.setThumbnail(selectedAnimal.getImage().url);

            embed.setTitle(`${capitalizeFirstLetter(selectedAnimal.getSpecies().commonNames[0])}`);
            
            embed.addField('Species', selectedAnimal.getSpecies().scientificName, true);

            const imageIndex = selectedAnimal.getSpecies().images.findIndex(image => {
                return image._id.equals(selectedAnimal.getImage()._id);
            });
            embed.addField('Image', `${imageIndex + 1}/${selectedAnimal.getSpecies().images.length}`, true);
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

    public buttonPress(buttonName: string, user: User): void {
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

        this.setEmbed(this.buildEmbed());
    }
}