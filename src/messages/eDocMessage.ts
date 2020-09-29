import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";

import { awaitUserNextMessage } from "../discordUtility/awaitUserNextMessage";
import { betterSend, safeDeleteMessage } from "../discordUtility/messageMan";
import { SmartEmbed } from "../discordUtility/smartEmbed";
import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import { EDoc, EDocField, EDocValue } from "../structures/eDoc";
import { getEDocTypeString } from "../structures/eDocSkeleton";
import { PointedArray } from "../structures/pointedArray";
import { UserError } from "../structures/userError";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// An eDoc field that specifically contains an array. Used to simplify array display.
type ArrayField = EDocField<PointedArray<EDocField<EDocValue>>>;

// An interactive message containing an editable document that allows for the editing of said document
export default class EDocMessage extends InteractiveMessage {
    // The base document
    private readonly eDoc: EDoc;

    // The stack of selected nested fields
    private readonly selectionStack: EDocField<EDocValue>[] = [];

    // An array field within a document field that could be selected for viewing
    private selectedArrayField: ArrayField | undefined;

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

    private getSelectedArrayField(): ArrayField | undefined {
        if (this.selectedArrayField && !(this.selectedArrayField.value instanceof PointedArray)) {
            throw new Error('Non-array field found in eDoc message selectedArray field.');
        }

        return this.selectedArrayField;
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

        const selectedArrayField = this.getSelectedArrayField();

        if (selectedArrayField === undefined) {
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
                        field.value = field.value as string;

                        if (field.value === undefined) {
                            valueString = '*Empty*';
                        }
                        else {
                            valueString = field.value;
                        }
                        break;
                    }
                    // If the field holds a number
                    case 'number': {
                        field.value = field.value as number;

                        if (field.value === undefined) {
                            valueString = '*NaN*';
                        }
                        else {
                            valueString = field.value.toString();
                        }
                        break;
                    }
                    // If the field holds an array
                    case 'array': {
                        field.value = field.value as PointedArray<EDocField<EDocValue>>;

                        if (field.value === undefined || field.value.length === 0) {
                            valueString = '*Empty list*';
                        }
                        else {
                            valueString = field.value.toString({ delimiter: '\n', numbered: true });
                        }
                        break;
                    }
                    // If the field holds a nested eDoc
                    case 'edoc': {
                        if (field.value === undefined) {
                            throw new Error('Value for a nested EDoc cannot be undefined. Must be initialized.');
                        }

                        field.value = field.value as EDoc;

                        valueString = capitalizeFirstLetter(`${field.info.alias || 'anonymous'} document`);
                        break;
                    }
                }

                embed.addField(capitalizeFirstLetter(fieldLabel), valueString);
            }
        }
        else {
            embed.setTitle(`Now editing: __${capitalizeFirstLetter(selectedArrayField.info.alias || 'list')}__`);

            const arrayString = selectedArrayField.value.toString({ delimiter: '\n', numbered: true, pointer: '✏️' });

            embed.setDescription(arrayString || '*Empty list*');
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
                const selectedArrayField = this.getSelectedArrayField();

                if (selectedArrayField) {
                    selectedArrayField.value.decrementPointer();
                }
                else {
                    selectedObject.value.decrementPointer();
                }
                break;
            }
            case 'pointerDown': {
                const selectedArrayField = this.getSelectedArrayField();

                if (selectedArrayField) {
                    selectedArrayField.value.decrementPointer();
                }
                else {
                    selectedObject.value.incrementPointer();
                }
                break;
            }
            case 'edit': {
                const selectedFieldName = selectedObject.value.getSelectedFieldName();
                const selectedField = selectedObject.value.getSelectedField();

                const fieldType = getEDocTypeString(selectedField.info.type);
                // Do different things depending on what kind of data is in the selected field
                switch (fieldType) {
                    // Get and assign string or number input
                    case 'string': 
                    case 'number': {
                        let promptString: string;
                        if (fieldType === 'string') {
                            promptString = selectedField.info.prompt || 'Enter your input for this field:';
                        }
                        else {
                            promptString = selectedField.info.prompt || 'Enter your numeric input for this field:'
                        }

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
                        this.selectedArrayField = selectedField as ArrayField;
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
                if (this.selectedArrayField) {
                    this.selectedArrayField = undefined;
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