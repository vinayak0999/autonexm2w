import { configureStore, createSlice } from '@reduxjs/toolkit';

// Helper to safely parse JSON from localStorage
const safeParseJSON = (key, fallback = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        localStorage.removeItem(key);
        return fallback;
    }
};

// --- Auth Slice (Keeps user logged in) ---
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: safeParseJSON('user'),
        token: localStorage.getItem('token') || null,
    },
    reducers: {
        loginSuccess: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            localStorage.setItem('user', JSON.stringify(action.payload.user));
            localStorage.setItem('token', action.payload.token);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // Also clear test session on logout
            localStorage.removeItem('sessionId');
            localStorage.removeItem('currentIndex');
            localStorage.removeItem('totalQuestions');
        }
    }
});

// --- Test Slice (Tracks the Blocking State with Full Persistence) ---
const testSlice = createSlice({
    name: 'test',
    initialState: {
        sessionId: localStorage.getItem('sessionId') || null,
        currentIndex: parseInt(localStorage.getItem('currentIndex')) || 0,
        totalQuestions: parseInt(localStorage.getItem('totalQuestions')) || 0,
        isCompleted: localStorage.getItem('isCompleted') === 'true',
    },
    reducers: {
        startSession: (state, action) => {
            state.sessionId = action.payload.session_id;
            state.currentIndex = action.payload.current_index || 0;
            state.totalQuestions = action.payload.total_questions || 0;
            state.isCompleted = action.payload.is_completed || false;

            // Persist all values
            localStorage.setItem('sessionId', action.payload.session_id);
            localStorage.setItem('currentIndex', (action.payload.current_index || 0).toString());
            localStorage.setItem('totalQuestions', (action.payload.total_questions || 0).toString());
            localStorage.setItem('isCompleted', (action.payload.is_completed || false).toString());
        },
        updateIndex: (state, action) => {
            state.currentIndex = action.payload;
            localStorage.setItem('currentIndex', action.payload.toString());
        },
        completeTest: (state) => {
            state.isCompleted = true;
            localStorage.setItem('isCompleted', 'true');
            // Clear session data
            localStorage.removeItem('sessionId');
            localStorage.removeItem('currentIndex');
            localStorage.removeItem('totalQuestions');
        },
        // New: Reset test state (for starting fresh)
        resetTestState: (state) => {
            state.sessionId = null;
            state.currentIndex = 0;
            state.totalQuestions = 0;
            state.isCompleted = false;
            localStorage.removeItem('sessionId');
            localStorage.removeItem('currentIndex');
            localStorage.removeItem('totalQuestions');
            localStorage.removeItem('isCompleted');
        }
    }
});

export const { loginSuccess, logout } = authSlice.actions;
export const { startSession, updateIndex, completeTest, resetTestState } = testSlice.actions;

export const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
        test: testSlice.reducer,
    },
});
