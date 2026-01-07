import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { updateIndex, completeTest, resetTestState } from '../store';
import { Clock, ExternalLink, AlertTriangle, CheckCircle, Save, WifiOff, RefreshCw, XCircle, Home, AlertOctagon } from 'lucide-react';

// Helper function to format seconds into H:MM:SS
const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return "0:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Status screens for different states
const StatusScreen = ({ icon: Icon, iconColor, title, message, showHomeButton = true, onHomeClick }) => (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${iconColor}`}>
                <Icon className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">{title}</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            {showHomeButton && (
                <button
                    onClick={onHomeClick}
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                    <Home className="w-5 h-5" /> Go to Home
                </button>
            )}
        </div>
    </div>
);

const TestInterface = () => {
    const { sessionId, currentIndex, totalQuestions, isCompleted } = useSelector((state) => state.test);
    const { user } = useSelector((state) => state.auth);

    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(null);
    const [timerError, setTimerError] = useState(false);

    // Status states for user-friendly messages
    const [statusState, setStatusState] = useState(null); // 'completed', 'no_questions', 'session_expired', 'no_session'

    // Form State
    const [formData, setFormData] = useState({
        status: '',
        explanation: '',
        criticalError: ''
    });

    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Use ref for timer interval to prevent memory leaks
    const timerIntervalRef = useRef(null);
    const endTimeRef = useRef(null);

    // Handle going home
    const handleGoHome = () => {
        dispatch(resetTestState());
        navigate('/');
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, []);

    // Check if already completed from Redux
    useEffect(() => {
        if (isCompleted) {
            setStatusState('completed');
            setLoading(false);
        }
    }, [isCompleted]);

    // Redirect if no session
    useEffect(() => {
        if (!sessionId && !statusState) {
            setStatusState('no_session');
            setLoading(false);
        }
    }, [sessionId, statusState]);

    // Initialize timer with server time
    const initializeTimer = useCallback(async () => {
        if (!sessionId) return;

        try {
            const res = await api.get(`/session/${sessionId}/info`);

            if (res.data.is_completed) {
                setStatusState('completed');
                dispatch(completeTest());
                return;
            }

            const startTime = new Date(res.data.start_time).getTime();
            const durationMs = res.data.duration_minutes * 60 * 1000;
            endTimeRef.current = startTime + durationMs;

            // Clear any existing interval
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }

            // Update timer immediately
            const now = Date.now();
            const distance = endTimeRef.current - now;
            if (distance > 0) {
                setTimeLeft(Math.floor(distance / 1000));
            }

            // Set up interval
            timerIntervalRef.current = setInterval(() => {
                const currentTime = Date.now();
                const remaining = endTimeRef.current - currentTime;

                if (remaining <= 0) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                    setTimeLeft(0);
                    setStatusState('time_up');
                    dispatch(completeTest());
                } else {
                    setTimeLeft(Math.floor(remaining / 1000));
                }
            }, 1000);

            setTimerError(false);
        } catch (err) {
            console.error("Timer initialization error:", err);
            if (err.response?.status === 404) {
                setStatusState('session_expired');
            } else {
                setTimerError(true);
                // Retry timer after 5 seconds
                setTimeout(() => initializeTimer(), 5000);
            }
        }
    }, [sessionId, dispatch]);

    // Initialize timer on mount
    useEffect(() => {
        if (sessionId && !statusState) {
            initializeTimer();
        }
    }, [sessionId, statusState, initializeTimer]);

    // Fetch question with retry logic
    const fetchQuestion = useCallback(async (retryAttempt = 0) => {
        if (!sessionId || statusState) return;

        setLoading(true);
        setNetworkError(false);

        try {
            const res = await api.get(`/session/${sessionId}/question`);
            setQuestion(res.data);
            setFormData({ status: '', explanation: '', criticalError: '' });
            setRetryCount(0);
        } catch (err) {
            const errorDetail = err.response?.data?.detail || '';
            const errorStatus = err.response?.status;

            // Test completed
            if (errorDetail === "Test Completed" || errorDetail === "Test is already completed") {
                setStatusState('completed');
                dispatch(completeTest());
                return;
            }

            // No questions in test
            if (errorStatus === 400 && (errorDetail.includes("index") || errorDetail.includes("empty"))) {
                setStatusState('no_questions');
                return;
            }

            // Session not found
            if (errorStatus === 404) {
                setStatusState('session_expired');
                return;
            }

            console.error("Fetch question error:", err);
            setNetworkError(true);
            setRetryCount(retryAttempt);

            // Auto-retry with exponential backoff (max 5 retries)
            if (retryAttempt < 5) {
                const delay = Math.min(1000 * Math.pow(2, retryAttempt), 30000);
                setTimeout(() => fetchQuestion(retryAttempt + 1), delay);
            }
        } finally {
            setLoading(false);
        }
    }, [sessionId, statusState, dispatch]);

    // Fetch question on index change
    useEffect(() => {
        if (sessionId && !statusState) {
            fetchQuestion(0);
        }
    }, [sessionId, currentIndex, statusState, fetchQuestion]);

    // Manual retry handler
    const handleRetry = () => {
        fetchQuestion(0);
        initializeTimer();
    };

    // Submit answer
    const handleSubmit = async () => {
        if (!formData.status) {
            alert("⚠️ Please select a Task Status (Success or Failure).");
            return;
        }
        if (!formData.explanation.trim()) {
            alert("⚠️ Please provide an explanation.");
            return;
        }

        setSubmitting(true);
        setNetworkError(false);

        try {
            await api.post(`/session/${sessionId}/submit`, {
                question_id: question.id,
                status: formData.status,
                explanation: formData.explanation.trim(),
                critical_error: formData.criticalError.trim() || "None"
            });

            // Update Redux and persist index
            const newIndex = currentIndex + 1;
            dispatch(updateIndex(newIndex));

        } catch (err) {
            console.error("Submit error:", err);
            const errorDetail = err.response?.data?.detail || '';

            if (errorDetail === "Sync Error. You are answering the wrong question.") {
                fetchQuestion(0);
                alert("⚠️ Question sync issue detected. Refreshing...");
            } else if (errorDetail === "Test is already completed" || errorDetail === "Invalid session") {
                setStatusState('completed');
                dispatch(completeTest());
            } else {
                alert("❌ Submission failed. Please check your internet connection and try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ============ RENDER STATUS SCREENS ============

    // Test Completed
    if (statusState === 'completed') {
        return (
            <StatusScreen
                icon={CheckCircle}
                iconColor="bg-green-100 text-green-600"
                title="You have completed the test already!"
                message="Thank you for your participation. Your responses have been saved successfully."
                onHomeClick={handleGoHome}
            />
        );
    }

    // Time Up
    if (statusState === 'time_up') {
        return (
            <StatusScreen
                icon={Clock}
                iconColor="bg-orange-100 text-orange-600"
                title="Time's Up!"
                message="Your test time has ended. Your responses have been saved automatically."
                onHomeClick={handleGoHome}
            />
        );
    }

    // No Questions in Test
    if (statusState === 'no_questions') {
        return (
            <StatusScreen
                icon={AlertOctagon}
                iconColor="bg-yellow-100 text-yellow-600"
                title="No Questions Available"
                message="This test has no questions yet. Please contact your administrator to add questions."
                onHomeClick={handleGoHome}
            />
        );
    }

    // Session Expired or Not Found
    if (statusState === 'session_expired') {
        return (
            <StatusScreen
                icon={XCircle}
                iconColor="bg-red-100 text-red-600"
                title="Session Expired"
                message="Your test session has expired or was not found. Please login again to start a new session."
                onHomeClick={handleGoHome}
            />
        );
    }

    // No Session
    if (statusState === 'no_session') {
        return (
            <StatusScreen
                icon={AlertTriangle}
                iconColor="bg-gray-100 text-gray-600"
                title="No Active Session"
                message="You don't have an active test session. Please login to start a new test."
                onHomeClick={handleGoHome}
            />
        );
    }

    // Loading state
    if (loading && !question) {
        return <LoadingScreen retryCount={retryCount} onRetry={handleRetry} />;
    }

    // ============ MAIN TEST INTERFACE ============
    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">

            {/* --- TOP HEADER (Progress & Timer) --- */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold tracking-wide">
                        Autonex AI
                    </div>
                    <span className="text-gray-500 text-sm border-l pl-4 border-gray-300">
                        {user?.username}
                    </span>
                </div>

                <div className="flex flex-col items-center w-1/3">
                    <div className="flex justify-between w-full text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{currentIndex + 1} / {totalQuestions}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-indigo-600 h-2 transition-all duration-500"
                            style={{ width: `${totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Clock className={`w-5 h-5 ${timerError ? 'text-red-500' : 'text-indigo-600'}`} />
                    {timerError ? (
                        <span className="text-red-500 text-sm">Timer error - reconnecting...</span>
                    ) : (
                        <span className={`text-lg ${timeLeft !== null && timeLeft < 600 ? 'text-red-600 font-bold animate-pulse' : ''}`}>
                            {timeLeft !== null ? formatTime(timeLeft) : 'Loading...'}
                        </span>
                    )}
                </div>
            </header>

            {/* --- MAIN CONTENT (Split View) --- */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT: Task Description (Scrollable) */}
                <div className="w-1/2 p-8 overflow-y-auto border-r border-gray-200 bg-white">
                    <div className="mb-6">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Task</span>
                        <h1 className="text-2xl font-bold text-gray-900 mt-1">
                            Task {question?.task_id ? `#${question.task_id}` : `#${question?.id}`}
                        </h1>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-8">
                        <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                            <ExternalLink className="w-4 h-4" /> Task Resource
                        </h3>
                        <p className="text-blue-800 text-sm mb-4">
                            Access the external tool to evaluate this datapoint.
                        </p>
                        <a
                            href={question?.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
                        >
                            Open Link in New Tab
                        </a>
                    </div>

                    <div className="prose text-gray-600 leading-relaxed">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Instructions</h3>
                        <p>{question?.description}</p>
                    </div>
                </div>

                {/* RIGHT: Input Form (Scrollable) */}
                <div className="w-1/2 bg-gray-50 p-8 overflow-y-auto">
                    <div className="max-w-xl mx-auto">

                        {/* Network Error Banner */}
                        {networkError && (
                            <div className="mb-6 bg-red-100 border border-red-300 text-red-700 p-4 rounded flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <WifiOff className="w-5 h-5" />
                                    <div>
                                        <span className="font-medium">Connection Issue</span>
                                        <p className="text-sm opacity-75">Retry attempt {retryCount}/5...</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRetry}
                                    className="bg-red-200 hover:bg-red-300 px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                    <RefreshCw className="w-4 h-4" /> Retry Now
                                </button>
                            </div>
                        )}

                        {/* Field 1: Task Status */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">1. Task Status <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFormData({ ...formData, status: 'Success' })}
                                    className={`p-4 rounded border flex items-center justify-center gap-2 transition ${formData.status === 'Success'
                                        ? 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-500'
                                        : 'bg-white border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <CheckCircle className={`w-5 h-5 ${formData.status === 'Success' ? 'text-green-600' : 'text-gray-300'}`} />
                                    <span className="font-medium">Success</span>
                                </button>

                                <button
                                    onClick={() => setFormData({ ...formData, status: 'Failure' })}
                                    className={`p-4 rounded border flex items-center justify-center gap-2 transition ${formData.status === 'Failure'
                                        ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500'
                                        : 'bg-white border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <AlertTriangle className={`w-5 h-5 ${formData.status === 'Failure' ? 'text-red-600' : 'text-gray-300'}`} />
                                    <span className="font-medium">Failure</span>
                                </button>
                            </div>
                        </div>

                        {/* Field 2: Explanation */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">2. Task Explanation <span className="text-red-500">*</span></label>
                            <textarea
                                className="w-full h-32 p-4 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none shadow-sm text-sm"
                                placeholder="Describe your reasoning..."
                                value={formData.explanation}
                                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                            ></textarea>
                        </div>

                        {/* Field 3: Critical Error */}
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Critical Error (Optional)</label>
                            <textarea
                                className="w-full h-24 p-4 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none shadow-sm text-sm"
                                placeholder="Log any critical system errors here..."
                                value={formData.criticalError}
                                onChange={(e) => setFormData({ ...formData, criticalError: e.target.value })}
                            ></textarea>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || networkError}
                            className={`w-full py-4 rounded-lg font-bold transition flex items-center justify-center gap-2 shadow-lg ${submitting || networkError
                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                                }`}
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Submit & Next Task
                                </>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            Answers are auto-saved. You cannot return to previous questions.
                        </p>

                    </div>
                </div>
            </div>
        </div>
    );
};

// Loading Screen with retry indication
const LoadingScreen = ({ retryCount, onRetry }) => (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 flex-col gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-gray-600 font-medium">Loading your test...</p>
        {retryCount > 0 && (
            <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-orange-500 text-sm">Connection issue. Retry {retryCount}/5...</p>
                <button
                    onClick={onRetry}
                    className="text-indigo-600 hover:text-indigo-800 text-sm underline flex items-center gap-1"
                >
                    <RefreshCw className="w-4 h-4" /> Retry manually
                </button>
            </div>
        )}
    </div>
);

export default TestInterface;
