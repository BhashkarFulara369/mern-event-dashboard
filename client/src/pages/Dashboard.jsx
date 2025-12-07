import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const availableTimezones = [
    'UTC',
    'America/New_York', // Eastern Time (ET)
    'America/Los_Angeles', // Pacific Time (PT)
    'Europe/London',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney'
];

const Dashboard = () => {
    // Data State
    const [profiles, setProfiles] = useState([]);
    const [events, setEvents] = useState([]);
    const [currentProfileId, setCurrentProfileId] = useState('');

    // UI State
    const [viewTimezone, setViewTimezone] = useState('America/New_York');
    const [editingEventId, setEditingEventId] = useState(null);
    const [showLogsFor, setShowLogsFor] = useState(null);
    const [logs, setLogs] = useState([]);
    const [notification, setNotification] = useState(null); // { message, type: 'success'|'error' }

    // Form Custom Select State
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [profileSearchText, setProfileSearchText] = useState('');
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    // Global Header Custom Select State
    const [isGlobalDropdownOpen, setIsGlobalDropdownOpen] = useState(false);
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [isCreatingGlobalProfile, setIsCreatingGlobalProfile] = useState(false);
    const [newGlobalProfileName, setNewGlobalProfileName] = useState('');

    // Form State
    const [selectedProfiles, setSelectedProfiles] = useState([]);
    const [eventForm, setEventForm] = useState({
        title: '',
        timezone: 'America/New_York',
        startDate: '',
        startTime: '09:00',
        endDate: '',
        endTime: '09:00'
    });

    useEffect(() => {
        fetchProfiles();
        fetchEvents();
    }, []);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Helper to get consistent formatting
    const formatDateForView = (dateStr) => {
        return dayjs(dateStr).tz(viewTimezone).format('MMM D, h:mm A');
    };

    const fetchProfiles = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/profiles');
            setProfiles(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchEvents = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/events');
            setEvents(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchLogs = async (eventId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/events/${eventId}/logs`);
            setLogs(res.data);
        } catch (err) { console.error(err); }
    };

    const handleCreateProfile = async (name, isGlobal = false) => {
        if (!name.trim()) return;
        try {
            const res = await axios.post('http://localhost:5000/api/profiles', { name: name, timezone: 'UTC' });
            await fetchProfiles(); // Refresh list to include new profile

            // Handle State cleanup
            if (isGlobal) {
                setNewGlobalProfileName('');
                setIsCreatingGlobalProfile(false);
                setCurrentProfileId(res.data._id); // Auto switch context
            } else {
                setNewProfileName('');
                setIsCreatingProfile(false);
                setSelectedProfiles(prev => [...prev, res.data._id]); // Auto select in form
            }
            setNotification({ message: 'Profile added successfully!', type: 'success' });
        } catch (err) {
            setNotification({ message: err.message, type: 'error' });
        }
    };

    const toggleProfileSelection = (id) => {
        if (selectedProfiles.includes(id)) {
            setSelectedProfiles(selectedProfiles.filter(pid => pid !== id));
        } else {
            setSelectedProfiles([...selectedProfiles, id]);
        }
    };

    const editEvent = (ev) => {
        setEditingEventId(ev._id);
        const startTz = dayjs(ev.start).tz(ev.timezone);
        const endTz = dayjs(ev.end).tz(ev.timezone);

        setEventForm({
            title: ev.title,
            timezone: ev.timezone,
            startDate: startTz.format('YYYY-MM-DD'),
            startTime: startTz.format('HH:mm'),
            endDate: endTz.format('YYYY-MM-DD'),
            endTime: endTz.format('HH:mm')
        });
        setSelectedProfiles(ev.assignedTo.map(p => p._id));
    };

    const cancelEdit = () => {
        setEditingEventId(null);
        setEventForm({ title: '', timezone: 'America/New_York', startDate: '', startTime: '09:00', endDate: '', endTime: '09:00' });
        setSelectedProfiles([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!eventForm.startDate || !eventForm.endDate) {
                setNotification({ message: 'Please pick dates', type: 'error' });
                return;
            }

            const startDateTime = `${eventForm.startDate}T${eventForm.startTime}`;
            const endDateTime = `${eventForm.endDate}T${eventForm.endTime}`;

            const startISO = dayjs.tz(startDateTime, eventForm.timezone).toISOString();
            const endISO = dayjs.tz(endDateTime, eventForm.timezone).toISOString();

            if (dayjs(startISO).isAfter(dayjs(endISO))) {
                setNotification({ message: 'End time must be after start time', type: 'error' });
                return;
            }

            const payload = {
                profiles: selectedProfiles,
                timezone: eventForm.timezone,
                start: startISO,
                end: endISO,
                title: eventForm.title || 'New Event',
                description: ''
            };

            if (editingEventId) {
                await axios.put(`http://localhost:5000/api/events/${editingEventId}`, payload);
                setNotification({ message: 'Event Updated Successfully!', type: 'success' });
                setEditingEventId(null);
            } else {
                await axios.post('http://localhost:5000/api/events', payload);
                setNotification({ message: 'Event Created Successfully!', type: 'success' });
            }

            setEventForm({ title: '', timezone: 'America/New_York', startDate: '', startTime: '09:00', endDate: '', endTime: '09:00' });
            setSelectedProfiles([]);
            fetchEvents();
            if (showLogsFor) fetchLogs(showLogsFor);
        } catch (err) {
            console.error(err);
            setNotification({ message: err.response?.data?.error || 'Error saving event', type: 'error' });
        }
    };

    const filteredProfiles = profiles.filter(p => p.name.toLowerCase().includes(profileSearchText.toLowerCase()));

    // Global Header Filter
    const filteredGlobalProfiles = profiles.filter(p => p.name.toLowerCase().includes(globalSearchText.toLowerCase()));
    const currentProfileObj = profiles.find(p => p._id === currentProfileId);

    // Derived for UI
    const selectedProfileObjects = profiles.filter(p => selectedProfiles.includes(p._id));
    const profilePlaceholder = selectedProfileObjects.length > 0
        ? selectedProfileObjects.map(p => p.name).join(', ')
        : "Select profiles...";

    const filteredEvents = currentProfileId
        ? events.filter(ev => ev.assignedTo.some(p => p._id === currentProfileId))
        : events;

    return (
        <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: '"Outfit", sans-serif', color: '#334155' }}>
            {/* Notification Banner */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
                    color: notification.type === 'error' ? '#991b1b' : '#166534',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    {notification.type === 'error' ?
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                        :
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    }
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.2rem', color: '#1e293b', letterSpacing: '-0.025em' }}>Event Management</h1>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>Create and manage events across multiple timezones</p>
                </div>

                {/* Top Right Custom Profile Select (Global) */}
                <div style={{ position: 'relative', width: '250px', zIndex: 50 }}>
                    <div
                        onClick={() => setIsGlobalDropdownOpen(!isGlobalDropdownOpen)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            minHeight: '44px'
                        }}
                    >
                        <span style={{
                            color: currentProfileObj ? '#7c3aed' : '#94a3b8', // Purple if selected
                            fontWeight: currentProfileObj ? '700' : '400',
                            fontSize: '0.9rem'
                        }}>
                            {currentProfileObj ? currentProfileObj.name : 'Select Profile User'}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>▼</span>
                    </div>

                    {isGlobalDropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            width: '100%',
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.5rem',
                            marginTop: '0.5rem',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            padding: '0.5rem'
                        }}>
                            {!isCreatingGlobalProfile ? (
                                <>
                                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Search current profile..."
                                            value={globalSearchText}
                                            onChange={e => setGlobalSearchText(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem 0.5rem 0.5rem 2rem', // Space for icon
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '0.3rem',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                        <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                                        </span>
                                    </div>

                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <div
                                            onClick={() => { setCurrentProfileId(''); setIsGlobalDropdownOpen(false); }}
                                            style={{
                                                padding: '0.5rem',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                color: currentProfileId === '' ? '#7c3aed' : '#334155',
                                                backgroundColor: currentProfileId === '' ? '#f5f3ff' : 'transparent',
                                                borderRadius: '0.3rem',
                                                marginBottom: '0.2rem'
                                            }}
                                        >
                                            All Events (Admin)
                                        </div>
                                        {filteredGlobalProfiles.map(p => (
                                            <div
                                                key={p._id}
                                                onClick={() => { setCurrentProfileId(p._id); setIsGlobalDropdownOpen(false); }}
                                                style={{
                                                    padding: '0.5rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    color: currentProfileId === p._id ? '#7c3aed' : '#334155',
                                                    backgroundColor: currentProfileId === p._id ? '#f5f3ff' : 'transparent',
                                                    borderRadius: '0.3rem',
                                                    marginBottom: '0.2rem',
                                                    fontWeight: currentProfileId === p._id ? '600' : '400'
                                                }}
                                            >
                                                {p.name}
                                            </div>
                                        ))}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsCreatingGlobalProfile(true);
                                            }}
                                            style={{ padding: '0.5rem', color: '#7c3aed', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', borderTop: '1px solid #f1f5f9', marginTop: '0.2rem' }}
                                        >
                                            + Add Profile
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ padding: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        placeholder="Profile Name..."
                                        value={newGlobalProfileName}
                                        onChange={e => setNewGlobalProfileName(e.target.value)}
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '0.3rem',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.9rem'
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleCreateProfile(newGlobalProfileName, true);
                                            }
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleCreateProfile(newGlobalProfileName, true)}
                                            style={{ flex: 1, background: '#7c3aed', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingGlobalProfile(false)}
                                            style={{ flex: 1, background: '#e2e8f0', color: '#64748b', border: 'none', padding: '0.4rem', borderRadius: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Create Event Card */}
                <div className="card" style={{ height: 'fit-content', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#1e293b' }}>Create Event</h2>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Custom Profile Multi-Select */}
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block', color: '#334155' }}>Profiles</label>

                            <div style={{ position: 'relative' }}>
                                {/* Pseudo-Input Trigger */}
                                <div
                                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem',
                                        backgroundColor: '#f8fafc',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        minHeight: '48px'
                                    }}
                                >
                                    <span style={{ color: selectedProfiles.length ? '#1e293b' : '#94a3b8', fontSize: '0.95rem' }}>
                                        {profilePlaceholder}
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>▼</span>
                                </div>

                                {/* Dropdown Menu */}
                                {isProfileDropdownOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        width: '100%',
                                        zIndex: 10,
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.5rem',
                                        marginTop: '0.5rem',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        padding: '0.5rem'
                                    }}>
                                        {!isCreatingProfile ? (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="Search profiles..."
                                                    value={profileSearchText}
                                                    onChange={e => setProfileSearchText(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '0.3rem',
                                                        marginBottom: '0.5rem',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                    {filteredProfiles.length === 0 && <div style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>No profiles found</div>}
                                                    {filteredProfiles.map(p => (
                                                        <div
                                                            key={p._id}
                                                            onClick={() => toggleProfileSelection(p._id)}
                                                            style={{
                                                                padding: '0.5rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                borderRadius: '0.3rem',
                                                                backgroundColor: selectedProfiles.includes(p._id) ? '#eff6ff' : 'transparent'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProfiles.includes(p._id)}
                                                                readOnly
                                                                style={{ accentColor: '#4f46e5' }}
                                                            />
                                                            <span style={{ fontSize: '0.9rem', color: '#334155' }}>{p.name}</span>
                                                        </div>
                                                    ))}
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsCreatingProfile(true);
                                                        }}
                                                        style={{ padding: '0.5rem', color: '#4f46e5', fontWeight: '500', fontSize: '0.85rem', cursor: 'pointer', borderTop: '1px solid #f1f5f9', marginTop: '0.2rem' }}
                                                    >
                                                        + Add New Profile
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ padding: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    placeholder="Enter profile name..."
                                                    value={newProfileName}
                                                    onChange={e => setNewProfileName(e.target.value)}
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '0.3rem',
                                                        marginBottom: '0.5rem',
                                                        fontSize: '0.9rem'
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleCreateProfile(newProfileName, false);
                                                        }
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCreateProfile(newProfileName, false)}
                                                        style={{ flex: 1, background: '#4f46e5', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCreatingProfile(false)}
                                                        style={{ flex: 1, background: '#e2e8f0', color: '#64748b', border: 'none', padding: '0.4rem', borderRadius: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block', color: '#334155' }}>Title</label>
                            <input
                                type="text"
                                value={eventForm.title}
                                onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                                required
                                placeholder="Event Name"
                                style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem', borderRadius: '0.5rem', outline: 'none', color: '#475569' }}
                            />
                        </div>

                        {/* Timezone */}
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block', color: '#334155' }}>Timezone</label>
                            <select
                                value={eventForm.timezone}
                                onChange={e => setEventForm({ ...eventForm, timezone: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.5rem',
                                    appearance: 'none',
                                    outline: 'none',
                                    color: '#475569',
                                    fontSize: '0.95rem',
                                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.7rem top 50%',
                                    backgroundSize: '0.65rem auto'
                                }}
                            >
                                {availableTimezones.map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>

                        {/* Start Date & Time */}
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block', color: '#334155' }}>Start Date & Time</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 2, position: 'relative' }}>
                                    <input
                                        type={eventForm.startDate ? "date" : "text"}
                                        onFocus={e => e.target.type = 'date'}
                                        onBlur={e => { if (!e.target.value) e.target.type = 'text' }}
                                        placeholder="Pick a date"
                                        value={eventForm.startDate}
                                        onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })}
                                        required
                                        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem', borderRadius: '0.5rem', outline: 'none', color: '#475569' }}
                                    />
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="time"
                                        value={eventForm.startTime}
                                        onChange={e => setEventForm({ ...eventForm, startTime: e.target.value })}
                                        required
                                        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem', borderRadius: '0.5rem', outline: 'none', color: '#475569' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* End Date & Time */}
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block', color: '#334155' }}>End Date & Time</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 2, position: 'relative' }}>
                                    <input
                                        type={eventForm.endDate ? "date" : "text"}
                                        onFocus={e => e.target.type = 'date'}
                                        onBlur={e => { if (!e.target.value) e.target.type = 'text' }}
                                        placeholder="Pick a date"
                                        value={eventForm.endDate}
                                        onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })}
                                        required
                                        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem', borderRadius: '0.5rem', outline: 'none', color: '#475569' }}
                                    />
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input
                                        type="time"
                                        value={eventForm.endTime}
                                        onChange={e => setEventForm({ ...eventForm, endTime: e.target.value })}
                                        required
                                        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem', borderRadius: '0.5rem', outline: 'none', color: '#475569' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-block"
                            style={{
                                marginTop: '1.5rem',
                                backgroundColor: '#5b21b6',
                                padding: '1rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                borderRadius: '0.5rem',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                width: '100%'
                            }}
                        >
                            <span>+</span> {editingEventId ? 'Update Event' : 'Create Event'}
                        </button>
                    </form>
                </div>

                {/* Right Column: Events List */}
                <div className="card" style={{ height: 'fit-content', minHeight: '500px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: '#1e293b' }}>Events</h2>
                        <label style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.3rem' }}>View in Timezone</label>
                        <select
                            value={viewTimezone}
                            onChange={e => setViewTimezone(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.5rem',
                                outline: 'none',
                                color: '#475569',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.7rem top 50%',
                                backgroundSize: '0.65rem auto'
                            }}
                        >
                            {availableTimezones.map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                        {filteredEvents.length === 0 ? (
                            <div style={{ display: 'flex', height: '300px', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>
                                No events found
                            </div>
                        ) : null}

                        {filteredEvents.map(ev => {
                            const startInView = formatDateForView(ev.start);
                            const endInView = dayjs(ev.end).tz(viewTimezone).format('h:mm A');
                            const isEditing = editingEventId === ev._id;

                            return (
                                <div key={ev._id} style={{
                                    padding: '1.5rem',
                                    border: isEditing ? '2px solid #5b21b6' : '1px solid #e2e8f0',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isEditing ? '#f8fafc' : 'white',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{ev.title}</h3>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#64748b', fontWeight: '500', fontSize: '0.9rem' }}>
                                                {startInView} - {endInView}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                                            {ev.assignedTo.map(p => p.name).join(', ')}
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <button onClick={() => editEvent(ev)} style={{ background: 'none', border: 'none', color: '#5b21b6', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}>Edit</button>
                                            <button onClick={() => setShowLogsFor(showLogsFor === ev._id ? null : ev._id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                {showLogsFor === ev._id ? 'Audit Logs' : 'Logs'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Activity Logs Section (NEW DETAILED & TIMEZONE AWARE) */}
                                    {showLogsFor === ev._id && (
                                        <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569' }}>Activity Log</h5>
                                            {logs.length === 0 ? <small style={{ color: '#94a3b8' }}>No activity recorded.</small> : (
                                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569' }}>
                                                    {logs.map(log => {
                                                        const timeAgo = dayjs(log.createdAt).tz(viewTimezone).fromNow();

                                                        // If we have detailed changes, render them
                                                        if (log.changes && log.changes.length > 0) {
                                                            return log.changes.map((change, idx) => {
                                                                let text = '';
                                                                // Handle Date Fields
                                                                if (change.field === 'start' || change.field === 'end') {
                                                                    const oldVal = formatDateForView(change.oldValue);
                                                                    const newVal = formatDateForView(change.newValue);
                                                                    const fieldLabel = change.field === 'start' ? 'Start Time' : 'End Time';
                                                                    text = `${fieldLabel} changed from ${oldVal} to ${newVal}`;
                                                                }
                                                                // Handle Title
                                                                else if (change.field === 'title') {
                                                                    text = `Title changed from "${change.oldValue}" to "${change.newValue}"`;
                                                                }
                                                                // Handle Users
                                                                else if (change.field === 'assignedTo') {
                                                                    text = 'Attendees list updated';
                                                                }
                                                                // Default
                                                                else {
                                                                    text = `${change.field} updated`;
                                                                }

                                                                return (
                                                                    <li key={`${log._id}-${idx}`} style={{ marginBottom: '0.3rem' }}>
                                                                        <span>{text}</span>
                                                                        <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
                                                                            {timeAgo}
                                                                        </span>
                                                                    </li>
                                                                );
                                                            });
                                                        }

                                                        // Fallback for simple messages
                                                        return (
                                                            <li key={log._id} style={{ marginBottom: '0.3rem' }}>
                                                                <span>{log.message}</span>
                                                                <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
                                                                    {timeAgo}
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
