import mongoose, { Schema } from 'mongoose';

export const animalSchema = new Schema({
    species: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    }
});

export interface AnimalObject {
    species: string,
    owner: string
}

export const Animal = mongoose.model('Animal', animalSchema);