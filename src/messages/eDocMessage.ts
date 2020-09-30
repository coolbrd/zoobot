import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";

import { awaitUserNextMessage } from "../discordUtility/awaitUserNextMessage";
import { betterSend, safeDeleteMessage } from "../discordUtility/messageMan";
import { SmartEmbed } from "../discordUtility/smartEmbed";
import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { EDoc, EDocField, eDocFieldToString, EDocValue, pushEDocArrayField, setEDocField } from "../structures/eDoc";
import { EDocTypeHint, getEDocTypeString } from "../structures/eDocSkeleton";
import { PointedArray } from "../structures/pointedArray";
import { UserError } from "../structures/userError";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// An interactive message containing an editable document that allows for the editing of said document
export default class EDocMessage extends InteractiveMessage {
    // The base document
    private readonly eDoc: EDoc;

    // The stack of selected nested fields
    private readonly selectionStack: EDocField<EDocValue>[] = [];

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
            },
            {
                name: 'new',
                emoji: '🆕',
                helpMessage: 'New item'
            },
            {
                name: 'delete',
                emoji: '🗑️',
                helpMessage: 'Delete item'
            }
        ]});
        
        this.eDoc = eDoc;

        // Create an eDoc field based on the eDoc skeleton provided
        // This is done in here so declarations of top-level eDocs don't need to explicitly declare their type, as it's implicit
        const topField: EDocField<EDoc> = {
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
    private getSelection(): EDocField<EDocValue> {
        return this.selectionStack[this.selectionStack.length - 1];
    }

    public async build(): Promise<void> {
        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const selectedField = this.getSelection();

        if (!(selectedField.value instanceof EDoc) && !(selectedField.value instanceof PointedArray)) {
            throw new Error('Unexpected value type selected in eDoc.');
        }

        const embed = new SmartEmbed();

        if (selectedField.value instanceof EDoc) {
            embed.setTitle(`Now editing: __${capitalizeFirstLetter(selectedField.info.alias as string)}__`);

            // Iterate over every field in the eDoc
            for (const [fieldName, field] of selectedField.value.getFields()) {
                // Label the field
                let fieldLabel = (field.info.alias || 'anonymous field') + ': ';
                // Draw the edit icon if the current field is the selected field
                if (fieldName === selectedField.value.getSelectedFieldName()) {
                    fieldLabel += '✏️';
                }

                // The string form of this field's value
                let valueString: string;
                // Determine the string value based on the current field's type
                switch (getEDocTypeString(field.info.type)) {
                    // If the field holds a string
                    case 'string': {
                        valueString = eDocFieldToString(field);
                        break;
                    }
                    // If the field holds a number
                    case 'number': {
                        valueString = eDocFieldToString(field);
                        break;
                    }
                    // If the field holds an array
                    case 'array': {
                        valueString = eDocFieldToString(field);
                        break;
                    }
                    // If the field holds a nested eDoc
                    case 'edoc': {
                        if (field.value === undefined) {
                            throw new Error('Value for a nested EDoc cannot be undefined. Must be initialized.');
                        }

                        valueString = eDocFieldToString(field);
                        break;
                    }
                }

                embed.addField(capitalizeFirstLetter(fieldLabel), valueString);
            }
        }
        else {
            embed.setTitle(`Now editing: __${capitalizeFirstLetter(selectedField.info.alias || 'list')}__`);

            const arrayString = eDocFieldToString(selectedField, { arrayPointer: '✏️' });

            embed.setDescription(arrayString || '*Empty list*');
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        // Get the current field that's being displayed
        const selectedField = this.getSelection();

        // Make sure the selected field's value is either a document or an array
        if (!(selectedField.value instanceof EDoc) && !(selectedField.value instanceof PointedArray)) {
            throw new Error('Unexpected value type selected in eDoc.');
        }

        // Document controls
        if (selectedField.value instanceof EDoc) {
            // Get the field that the pointer is currently selecting
            const selectedNestedFieldName = selectedField.value.getSelectedFieldName();
            const selectedNestedField = selectedField.value.getSelectedField();

            // Button behavior depends on the field's contained information
            const fieldType = getEDocTypeString(selectedNestedField.info.type);

            switch (buttonName) {
                case 'pointerUp': {
                    selectedField.value.decrementPointer();
                    break;
                }
                case 'pointerDown': {
                    selectedField.value.incrementPointer();
                    break;
                }
                case 'edit': {
                    switch (fieldType) {
                        case 'string': 
                        case 'number': {
                            let promptString: string;
                            if (fieldType === 'string') {
                                promptString = selectedNestedField.info.prompt || 'Enter your input for this field:';
                            }
                            else {
                                promptString = selectedNestedField.info.prompt || 'Enter your numeric input for this field:'
                            }

                            const promptMessage = await betterSend(this.channel, promptString);
                            const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                            if (responseMessage) {
                                try {
                                    selectedField.value.setFieldByName(selectedNestedFieldName, responseMessage.content);
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
                            this.selectionStack.push(selectedNestedField);
                            break;
                        }
                        case 'edoc': {
                            this.selectionStack.push(selectedNestedField);
                            break;
                        }
                    }
                    break;
                }
                case 'delete': {
                    switch (fieldType) {
                        case 'string':
                        case 'number': {
                            setEDocField(selectedNestedField, undefined);
                            break;
                        }
                        case 'array': {
                            setEDocField(selectedNestedField, new PointedArray<EDocField<EDocValue>>());
                            break;
                        }
                    }
                    break;
                }
            }
        }
        else {
            switch (buttonName) {
                case 'pointerUp': {
                    selectedField.value.decrementPointer();
                    break;
                }
                case 'pointerDown': {
                    selectedField.value.incrementPointer();
                    break;
                }
                // Edit a single item within an array
                case 'edit': {
                    const selectedElement = selectedField.value.selection();

                    // Don't do anything if the array is empty
                    if (!selectedElement) {
                        break;
                    }

                    // Edit behavior depends on the type of array
                    switch (getEDocTypeString(selectedElement.info.type)) {
                        // For simple types, ask the user for input to replace the selected element
                        case 'string':
                        case 'number': {
                            const promptString = selectedField.info.prompt || 'Enter your input to replace this list entry:';

                            const promptMessage = await betterSend(this.channel, promptString);
                            const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                            if (responseMessage) {
                                try {
                                    setEDocField(selectedField.value.selection(), responseMessage.content);
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
                        // For array and document arrays, select the selected element as the new field to display
                        case 'array':
                        case 'edoc': {
                            this.selectionStack.push(selectedElement);
                            break;
                        }
                    }
                    break;
                }
                // Adding a new element to the selected array field
                case 'new': {
                    // Get the type of element that this array stores
                    switch (getEDocTypeString((selectedField.info.type as [EDocTypeHint])[0])) {
                        // For string and number arrays, just get input and make a new element from it
                        case 'string':
                        case 'number': {
                            const promptString = selectedField.info.prompt || 'Enter your input for a new list entry:';

                            const promptMessage = await betterSend(this.channel, promptString);
                            const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                            if (responseMessage) {
                                try {
                                    // Push user input to the array
                                    pushEDocArrayField(selectedField as EDocField<PointedArray<EDocField<EDocValue>>>, responseMessage.content);
                                }
                                catch (error) {
                                    // Display user errors as a message
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
                        // For array and document arrays, just push a new field (no input required)
                        case 'array':
                        case 'edoc': {
                            pushEDocArrayField(selectedField as EDocField<PointedArray<EDocField<EDocValue>>>);
                            break;
                        }
                    }
                    break;
                }
                case 'delete': {
                    selectedField.value.deleteAtPointer();
                    break;
                }
            }
        }

        // Back button behavior
        if (buttonName === 'back' && this.selectionStack.length > 1) {
            this.selectionStack.pop();
        }

        this.setEmbed(this.buildEmbed());
    }
}