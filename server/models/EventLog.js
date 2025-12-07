const mongoose = require('mongoose');

const EventLogSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    // We can store a summary string or structured data
    // "Time changed from 9:00 to 10:00"
    message: {
        type: String,
        required: true
    },
    // detailed changes for structured display if needed
    changes: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    }]
}, { timestamps: true });

module.exports = mongoose.model('EventLog', EventLogSchema);
