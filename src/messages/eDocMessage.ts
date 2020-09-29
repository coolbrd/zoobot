import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import { awaitUserNextMessage } from "../discordUtility/awaitUserNextMessage";

import { betterSend, safeDeleteMessage } from "../discordUtility/messageMan";
import { SmartEmbed } from "../discordUtility/smartEmbed";
import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { EDoc, EDocField } from "../structures/eDoc";
import { getEDocTypeString } from "../structures/eDocSkeleton";
import { PointedArray } from "../structures/pointedArray";
import { UserError } from "../structures/userError";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// An interactive message containing an editable document that allows for the editing of said document
export default class EDocMessage extends InteractiveMessage {
    // The base document
    private readonly eDoc: EDoc;

    // The selection trail of selected nested fields
    private readonly selectionStack: EDocField[] = [];

    // An array within a document that could be selected for viewing
    private selectedArray: PointedArray<EDocField> | undefined;

    public constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, eDoc: EDoc, docName?: string) {
        super(handler, channel, { buttons: [
            {
                name: 'pointerUp',
                emoji: '⬆️',
                helpMessage: 'Pointer up'
            },
            {
                name: 'pointerDown',
                emoji: '⬇️',
                helpMessage: 'Pointer down'
            },
            {
                name: 'edit',
                emoji: '✏️',
                helpMessage: 'Edit'
            },
            {
                name: 'back',
                emoji: '⬅️',
                helpMessage: 'Back'
            }
        ]});
        
        this.eDoc = eDoc;

        // Create an eDoc field based on the eDoc skeleton provided
        // This is done in here so declarations of top-level eDocs don't need to explicitly declare their type, as it's implicit
        const topField: EDocField = {
            info: {
                // Use the eDoc's skeleton as the field's type
                type: eDoc.getSkeleton(),
                // Assign the field a friendly name
                alias: docName || 'top document'
            },
            // Assign the eDoc as this field's value
            value: this.eDoc
        }

        // Add the newly created eDoc field to the front of the selection stack, meaning it's selected
        this.selectionStack.push(topField);
    }

    // Gets this message's currently selected field
    private getSelection(): EDocField {
        return this.selectionStack[this.selectionStack.length - 1];
    }

    public async build(): Promise<void> {
        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const selectedObject = this.getSelection();

        if (!(selectedObject.value instanceof EDoc)) {
            throw new Error('Unexpected value type selected in eDoc.');
        }

        const embed = new SmartEmbed();

        if (this.selectedArray === undefined) {
            embed.setTitle(`Now editing: __${capitalizeFirstLetter(selectedObject.info.alias as string)}__`);

            // Iterate over every field in the eDoc
            for (const [fieldName, field] of selectedObject.value.getFields()) {
                // Label the field
                let fieldLabel = (field.info.alias || 'anonymous field') + ': ';
                // Draw the edit icon if the current field is the selected field
                if (fieldName === selectedObject.value.getSelectedFieldName()) {
                    fieldLabel += '✏️';
                }

                // The string form of this field's value
                let valueString: string;
                // Determine the string value based on the current field's type
                switch (getEDocTypeString(field.info.type)) {
                    // If the field holds a string
                    case 'string': {
                        if (field.value === undefined) {
                            valueString = '*Empty*';
                        }
                        else {
                            valueString = field.value as string;
                        }
                        break;
                    }
                    // If the field holds a number
                    case 'number': {
                        if (field.value === undefined) {
                            valueString = '*NaN*';
                        }
                        else {
                            valueString = (field.value as number).toString();
                        }
                        break;
                    }
                    // If the field holds an array
                    case 'array': {
                        field.value = field.value as PointedArray<EDocField>;

                        if (field.value === undefined || field.value.length === 0) {
                            valueString = '*Empty list*';
                        }
                        else {
                            valueString = (field.value as unknown[]).toString();
                        }
                        break;
                    }
                    // If the field holds a nested eDoc
                    case 'edoc': {
                        if (field.value === undefined) {
                            throw new Error('Value for a nested EDoc cannot be undefined. Must be initialized.');
                        }
                        else {
                            field.value = field.value as EDoc;

                            valueString = capitalizeFirstLetter(`${field.info.alias || 'anonymous'} document`);
                        }
                        break;
                    }
                }

                embed.addField(capitalizeFirstLetter(fieldLabel), valueString);
            }
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        const selectedObject = this.getSelection();

        if (!(selectedObject.value instanceof EDoc)) {
            throw new Error('Unexpected value type selected in eDoc.');
        }

        switch (buttonName) {
            case 'pointerUp': {
                if (this.selectedArray) {
                    this.selectedArray.decrementPointer();
                }
                else {
                    selectedObject.value.decrementPointer();
                }
                break;
            }
            case 'pointerDown': {
                if (this.selectedArray) {
                    this.selectedArray.incrementPointer();
                }
                else {
                    selectedObject.value.incrementPointer();
                }
                break;
            }
            case 'edit': {
                const selectedFieldName = selectedObject.value.getSelectedFieldName();
                const selectedField = selectedObject.value.getSelectedField();

                // Do different things depending on what kind of data is in the selected field
                switch (getEDocTypeString(selectedField.info.type)) {
                    // Get and assign string input
                    case 'string': {
                        const promptString = selectedField.info.prompt || 'Enter your input for this field:';
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        if (responseMessage) {
                            try {
                                selectedObject.value.set(selectedFieldName, responseMessage.content);
                            }
                            catch (error) {
                                if (error instanceof UserError) {
                                    betterSend(this.channel, error.message, 10000);
                                }
                                else {
                                    throw new Error(error.message);
                                }
                            }

                            safeDeleteMessage(responseMessage);
                        }
                        safeDeleteMessage(promptMessage);
                        break;
                    }
                    // Get and assign number input
                    case 'number': {
                        const promptString = selectedField.info.prompt || 'Enter your numeric input for this field:';
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        if (responseMessage) {
                            try {
                                selectedObject.value.set(selectedFieldName, responseMessage.content);
                            }
                            catch (error) {
                                if (error instanceof UserError) {
                                    betterSend(this.channel, 'Error: ' + error.message, 10000);
                                }
                                else {
                                    throw new Error(error.message);
                                }
                            }

                            safeDeleteMessage(responseMessage);
                        }

                        safeDeleteMessage(promptMessage);
                        break;
                    }
                    case 'array': {
                        this.selectedArray = selectedField.value as PointedArray<EDocField>;
                        break;
                    }
                    case 'edoc': {
                        this.selectionStack.push(selectedField);
                        break;
                    }
                }
                break;
            }
            case 'back': {
                // If the message is viewing an array, deselect it
                if (this.selectedArray) {
                    this.selectedArray = undefined;
                }
                // Otherwise, if the selection stack is more than just the base document (a nested field is selected)
                else if (this.selectionStack.length > 1) {
                    // Remove that field from the stack, returning to the selection before it
                    this.selectionStack.pop();
                }
                break;
            }
        }

        this.setEmbed(this.buildEmbed());
    }
}