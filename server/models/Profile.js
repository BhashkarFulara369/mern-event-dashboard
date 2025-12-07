const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    // Default timezone for this user
    timezone: {
        type: String,
        default: 'UTC'
    }
}, { timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);
