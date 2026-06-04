const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({

    elements: {
        type: Array,
        required: true
    },

    background: {
        type: Object,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Project", ProjectSchema);