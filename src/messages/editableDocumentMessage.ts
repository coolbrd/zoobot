import { MessageEmbed, TextChannel, User, Message, DMChannel } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';
import EditableDocument, { EditableDocumentField } from '../utility/editableDocument';
import { capitalizeFirstLetter, betterSend, awaitUserNextMessage, safeDeleteMessage } from '../utility/toolbox';
import { PointedArray } from '../utility/pointedArray';

// An interactive message that allows the user to edit and submit a configurable document
export default class EditableDocumentMessage extends InteractiveMessage {
    // The top-level document to edit and eventually submit
    private readonly document: EditableDocument;

    // The stack trace of where within the document we are
    private selection: EditableDocumentField[];

    private editEmoji: string;

    constructor(channel: TextChannel | DMChannel, document: EditableDocument, alias?: string, lifetime?: number) {
        const editEmoji = '✏️';
        super(channel, { buttons: [
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
                emoji: editEmoji,
                helpMessage: 'Edit selection'
            },
            {
                name: 'back',
                emoji: '⬅️',
                helpMessage: 'Back'
            },
            {
                name: 'delete',
                emoji: '🗑️',
                helpMessage: 'Delete entry'
            },
            {
                name: 'new',
                emoji: '🆕',
                helpMessage: 'New entry'
            },
            {
                name: 'submit',
                emoji: '✅',
                helpMessage: 'Done'
            },
            {
                name: 'exit',
                emoji: '❌',
                helpMessage: 'Exit'
            }
        ], lifetime: lifetime || 60000 });

        this.document = document;

        this.selection = [];
        // Start navigation at the top level document
        // This needs to be in an EditableDocumentFieldInfo wrapper so it looks like a regular field and can be operated on like one
        // However, this field is essentially anonymous. This makes it unlike the richer, predefined fields within the document.
        // No assumptions about type correctness should be made about this top-level field
        this.selection.push({
            fieldInfo: {
                alias: alias || 'document',
                type: 'document'
            },
            value: this.document
        });

        this.editEmoji = editEmoji;

        // Build the embed according to the top-level document
        this.setEmbed(this.buildEmbed());
    }

    // Gets this message's currently selected field
    private getSelection(): EditableDocumentField {
        // Return the field on the top of the stack
        return this.selection[this.selection.length - 1];
    }

    // Sets the field to select and edit
    // Puts it on top of the stack so the back button will properly navigate to wherever the user was before
    private setSelection(selection: EditableDocumentField): void {
        this.selection.push(selection);
    }

    // Navigates up one level of the selection stack trace
    private backOneLevel(): void {
        // Don't go anywhere if we're at the top level
        if (this.selection.length > 1) {
            this.selection.pop();
        }
    }

    // Build the message embed that represents the currently selected field
    protected buildEmbed(): MessageEmbed {
        const newEmbed = new MessageEmbed();

        // The currently selected EditableDocumentFieldInfo object
        const selection = this.getSelection();
        // Tell the user where they are
        newEmbed.setTitle(`Now editing: ${capitalizeFirstLetter(selection.fieldInfo.alias)}`);

        // If the current selection is a document (like the top-level one)
        if (selection.value instanceof EditableDocument) {
            // Get the document
            const document = selection.value;

            // Iterate over every field in the document
            for (const [key, field] of document.getFieldEntries()) {
                // Whether or not the current field is the one that's selected by the editor
                let selected = false;
                // If the name of the current field is marked as the document's currently selected field
                if (key === document.getSelectedFieldName()) {
                    selected = true;
                }

                const fieldNameString = `${capitalizeFirstLetter(field.fieldInfo.alias)}${field.fieldInfo.required ? '*' : ''} ${selected ? ` ${this.editEmoji} ` : ''}`;
                let fieldInfoString: string;
                if (field.value instanceof PointedArray) {
                    let delimiter = '\n';
                    if (typeof field.fieldInfo.arrayType === 'object') {
                        delimiter += '\n';
                    }
                    fieldInfoString = field.value.toString(delimiter);
                }
                else {
                    fieldInfoString = field.value.toString();
                }
                // Add a field representing the current field of the document, drawing an edit icon if it's the selected field
                newEmbed.addField(fieldNameString, fieldInfoString  || '*Empty*');
            }

            // Appropriately manage buttons for the current context (disabled buttons have no use here so don't show their help messages)
            this.enableButton('edit');
            this.disableButton('delete');
            this.disableButton('new');
            this.disableButton('submit');

            // If we're on the top level document
            if (this.selection.length === 1) {
                // If all requirements are met
                if (this.document.requirementsMet()) {
                    // Enable the submit button
                    this.enableButton('submit');
                }

                // Disable the back button
                this.disableButton('back');
            }
            // If we're at the top level, disable the back button
            else {
                this.enableButton('back');
            }
        }
        // If the selected value is an array of elements
        else if (selection.value instanceof PointedArray) {
            let content = '';
            let arrayIndex = 0;
            // Iterate over every item in the array
            for (const value of selection.value) {
                // If the current element is at the selected index
                const selected = selection.value.getPointerPosition() === arrayIndex;
                // Write the value of the element and draw the edit icon if it's selected

                let delimiter = '\n';
                if (value instanceof EditableDocument) {
                    delimiter += '\n';
                }

                content += `${value.toString()} ${selected ? ` ${this.editEmoji} ` : ''}${delimiter}`;
                arrayIndex++;
            }

            // If no information was added, don't just display nothing
            if (!content) {
                content = '*Empty*';
            }

            newEmbed.setDescription(content);

            // Update button context
            this.enableButton('back');
            this.enableButton('delete');
            this.enableButton('new');

            this.disableButton('submit');

            // If the array stores documents, use the edit button
            if (selection.fieldInfo.arrayType !== 'string') {
                this.enableButton('edit');
            }
            // Otherwise disable it because it doesn't do anything for strings
            else {
                this.disableButton('edit');
            }
        }
        // If the selected field is of an unexpected type
        else {
            throw new Error('Unexpected type of data selected by an EditableDocumentMessage');
        }

        // Add button help information to the footer
        newEmbed.setFooter(this.getButtonHelpString());

        return newEmbed;
    }

    // Whenever one of the active buttons is pressed
    public async buttonPress(buttonName: string, user: User): Promise<void> {
        // Make sure the timer is reset whenever a button is pressed
        super.buttonPress(buttonName, user);

        const selection = this.getSelection();

        // Button behavior
        switch (buttonName) {
            // Moves the pointer up
            case 'pointerUp': {
                // Decrement the pointer of the current selection if that's a valid thing to do
                if (selection.value instanceof EditableDocument || selection.value instanceof PointedArray) {
                    selection.value.decrementPointer();
                }
                break;
            }
            // Moves the pointer down
            case 'pointerDown': {
                // Increment the pointer of the current selection if that's a valid thing to do
                if (selection.value instanceof EditableDocument || selection.value instanceof PointedArray) {
                    selection.value.incrementPointer();
                }
                break;
            }
            // Selects the currently selected document or array and navigates inside of it to edit it
            // Also edits string and boolean values
            case 'edit': {
                // If the editor is currently editing a document
                if (selection.value instanceof EditableDocument) {
                    // Get the selected field from within the selected document
                    const selectedField = selection.value.getSelection();
                    // If the field is something that can be navigated inside of
                    if (selectedField.value instanceof EditableDocument || selectedField.value instanceof PointedArray) {
                        this.setSelection(selectedField);
                    }
                    // If the field is just a string
                    else if (typeof selectedField.value === 'string') {
                        // Get the user's input for the field
                        const promptString = selectedField.fieldInfo.prompt || 'Enter the information that you would like to insert into this field.'
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        // If the user responded
                        if (responseMessage) {
                            // Set the given input information as the field's new value
                            selectedField.value = responseMessage.content;

                            safeDeleteMessage(responseMessage);
                        }

                        safeDeleteMessage(promptMessage);
                    }
                    // If the selected field is a boolean value
                    else if (typeof selectedField.value === 'boolean') {
                        // Just toggle it
                        selectedField.value = !selectedField.value;
                    }
                    else if (typeof selectedField.value === 'number') {
                        // Get the user's input for the field
                        const promptString = selectedField.fieldInfo.prompt || 'Enter the number that you would like to insert into this field.'
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        // If the user responded
                        if (responseMessage) {
                            const responseNumber = Number(responseMessage.content);

                            // If a number was returned
                            if (!isNaN(responseNumber)) {
                                // Set the given input as the field's new value
                                selectedField.value = responseNumber;
                            }
                            // If the input could not be converted to a number
                            else {
                                betterSend(this.channel, 'Invalid input. This field requires a number.', 15000);
                            }

                            safeDeleteMessage(responseMessage);
                        }

                        safeDeleteMessage(promptMessage);
                    }
                    // If the selected field is something that it shouldn't be
                    else {
                        throw new Error('Unexpected type in EditableDocument');
                    }
                }
                // If the editor is currently editing an array
                else if (selection.value instanceof PointedArray) {
                    // Get the current selection of the array
                    const selectedElement = selection.value.selection();
                    // If the array element is a document
                    if (selectedElement instanceof EditableDocument) {
                        // Select the document for further editing
                        this.setSelection({
                            fieldInfo: {
                                alias: `Field within ${selection.fieldInfo.alias}`,
                                type: 'document'
                            },
                            value: selectedElement
                        });
                    }
                }
                break;
            }
            // Navigates up one level in the editor
            case 'back': {
                this.backOneLevel();
                break;
            }
            // Adds a new array element to the selected array
            case 'new': {
                // Make sure the selection is an array and not a document
                if (!(selection.value instanceof PointedArray)) {
                    break;
                }

                // If the array field is missing its type
                if (!selection.fieldInfo.arrayType) {
                    throw new Error('Found no type for a PointedArray when one was expected');
                }

                // If the array contains strings
                if (selection.fieldInfo.arrayType === 'string') {
                    // Get user input for a new string to insert and add it
                    const promptString = selection.fieldInfo.prompt || 'Enter your input for this new entry.';
                    const promptMessage = await betterSend(this.channel, promptString);

                    const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                    if (responseMessage) {
                        selection.value.addAtPointer(responseMessage.content);

                        safeDeleteMessage(responseMessage);
                    }

                    safeDeleteMessage(promptMessage);
                }
                // If the array contains documents
                else {
                    // Create an empty document of the array's document type and insert it
                    selection.value.addAtPointer(new EditableDocument(selection.fieldInfo.arrayType));
                }
                break;
            }
            // Deletes the currently selected array element if there is one
            case 'delete': {
                if (!(selection.value instanceof PointedArray)) {
                    break;
                }

                // Delete the current element
                selection.value.deleteAtPointer();
                break;
            }
            // Emits the "submit" event
            case 'submit': {
                // If the document's requirements weren't met
                if (!this.document.requirementsMet()) {
                    console.error('The submit button was pressed before a document\'s requirements were met somehow');
                    break;
                }
                this.emit('submit', this.document.getData());
                this.deactivate();
                break;
            }
            case 'exit': {
                this.emit('exit');
                this.deactivate();
                break;
            }
        }

        // Update the message's embed
        this.setEmbed(this.buildEmbed());
    }

    public async deactivate(): Promise<void> {
        const message = this.getMessage() as Message;
        const embed = message.embeds[0];

        // Get the embed's footer
        const footer = embed.footer;

        // Append the deactivated info to the end of the message's footer
        const newEmbed = embed.setFooter(`${footer ? `${footer.text} ` : ''}\n(deactivated)`);

        this.setEmbed(newEmbed);

        // Inherit parent deactivation behavior
        super.deactivate();
    }
}