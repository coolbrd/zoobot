import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const SpeciesSchema = new Schema({
    commonNames: {
        type: Array,
        required: true
    },
    scientificName: {
        type: String,
        required: true
    },
    family: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    naturalHabitat: {
        type: String,
        required: true
    },
    inGameRegion: {
        type: String,
        required: true
    },
    tags: {
        type: Array,
        required: true
    },
    item: {
        type: String,
        required: true
    }
});

export default mongoose.model('species', SpeciesSchema);