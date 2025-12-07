const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: ''
    },
    // We can just store start/end ISO strings.
    // The 'timezone' field helps us display it back or calculate duration if needed.
    start: {
        type: Date,
        required: true,
    },
    end: {
        type: Date,
        required: true,
    },
    timezone: {
        type: String,
        required: true,
    },
    // Who is this event for?
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
    }],
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
