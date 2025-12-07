const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const Event = require('../models/Event');

// --- Profiles ---

// Get all profiles
router.get('/profiles', async (req, res) => {
    try {
        const profiles = await Profile.find().sort({ createdAt: -1 });
        res.json(profiles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create profile
router.post('/profiles', async (req, res) => {
    try {
        const { name, timezone } = req.body;
        // Simple check
        let profile = await Profile.findOne({ name });
        if (profile) return res.status(400).json({ msg: 'Profile exists' });

        profile = new Profile({ name, timezone });
        await profile.save();
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Events ---

// Get events (optional filter by profileId)
router.get('/events', async (req, res) => {
    try {
        const { profileId } = req.query;
        let query = {};
        if (profileId) {
            query = { assignedTo: profileId };
        }

        const events = await Event.find(query).populate('assignedTo', 'name').sort({ start: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Event
router.post('/events', async (req, res) => {
    try {
        const { profiles, timezone, start, end, title, description } = req.body;
        // Start/End come in as ISO strings or Date objects relative to that timezone
        // We typically store them as UTC in DB, but the frontend should likely send ISO strings
        // representing the exact moment in time.

        const newEvent = new Event({
            title: title || 'New Event',
            description,
            assignedTo: profiles, // Array of IDs
            timezone,
            start,
            end
        });

        await newEvent.save();
        res.json(newEvent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const EventLog = require('../models/EventLog');

// Update Event
router.put('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { profiles, timezone, start, end, title, description } = req.body;

        const oldEvent = await Event.findById(id).populate('assignedTo');
        if (!oldEvent) return res.status(404).json({ error: 'Event not found' });

        // Validation
        if (new Date(start) >= new Date(end)) {
            return res.status(400).json({ error: 'End time must be after Start time' });
        }

        // Calculate Changes for Logging
        const changes = [];
        const logMessages = [];

        // Helper to format date for log (store as ISO in DB, format on frontend)
        const fmt = (d) => d ? new Date(d).toISOString() : 'N/A';

        if (oldEvent.title !== title) {
            changes.push({ field: 'title', oldValue: oldEvent.title, newValue: title });
            logMessages.push(`Title changed from "${oldEvent.title}" to "${title}"`);
        }

        // precise comparison for dates
        if (new Date(oldEvent.start).getTime() !== new Date(start).getTime()) {
            changes.push({ field: 'start', oldValue: oldEvent.start, newValue: start });
            logMessages.push(`Start time updated`);
        }
        if (new Date(oldEvent.end).getTime() !== new Date(end).getTime()) {
            changes.push({ field: 'end', oldValue: oldEvent.end, newValue: end });
            logMessages.push(`End time updated`);
        }

        // Assigned users comparison
        const oldIds = oldEvent.assignedTo.map(p => p._id.toString()).sort();
        const newIds = profiles.sort(); // profiles is array of strings (ids)
        if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
            changes.push({ field: 'assignedTo', oldValue: oldIds, newValue: newIds });
            logMessages.push(`Attendee list updated`);
        }

        // Update Event
        oldEvent.title = title;
        oldEvent.description = description;
        oldEvent.assignedTo = profiles;
        oldEvent.timezone = timezone;
        oldEvent.start = start;
        oldEvent.end = end;

        await oldEvent.save();

        // Create Logs
        if (changes.length > 0) {
            await EventLog.create({
                eventId: id,
                message: logMessages.join(', '),
                changes
            });
        }

        res.json(oldEvent);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Logs for an Event
router.get('/events/:id/logs', async (req, res) => {
    try {
        const logs = await EventLog.find({ eventId: req.params.id }).sort({ createdAt: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
