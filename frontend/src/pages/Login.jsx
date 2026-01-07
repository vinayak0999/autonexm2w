import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { loginSuccess, startSession } from '../store';
import { Lock, Mail, Key } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Authenticate with email and password
            const res = await api.post('/login', {
                username: email,
                password: password
            });
            const userData = res.data;

            // Save to Redux (includes is_admin from API)
            dispatch(loginSuccess({
                user: {
                    username: userData.username,
                    id: userData.user_id,
                    is_admin: userData.is_admin  // Issue #12 fix: Save is_admin
                },
                token: userData.access_token
            }));

            // 2. Get active test
            let activeTestRes;
            try {
                activeTestRes = await api.get('/admin/active-test');
            } catch (activeErr) {
                setError('⚠️ No active test available. Please contact your administrator.');
                setLoading(false);
                return;
            }

            if (!activeTestRes.data || !activeTestRes.data.id) {
                setError('⚠️ No active test available. The administrator needs to activate a test first.');
                setLoading(false);
                return;
            }

            // 3. Start/Resume Test with active test ID
            const startRes = await api.post(`/start-test/${activeTestRes.data.id}/${userData.user_id}`);
            dispatch(startSession(startRes.data));

            // Redirect to Test Area
            navigate('/test');

        } catch (err) {
            const errorDetail = err.response?.data?.detail || '';

            if (errorDetail === 'Invalid credentials') {
                setError('❌ Incorrect email or password. Please try again.');
            } else if (errorDetail === 'User not found') {
                setError('❌ This email is not registered. Please contact your administrator.');
            } else if (err.response?.status === 401) {
                setError('❌ Authentication failed. Please check your credentials.');
            } else if (err.isNetworkError || !err.response) {
                setError('🔌 Unable to connect to server. Please check your internet connection.');
            } else {
                setError(`❌ ${errorDetail || 'Login failed. Please try again.'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-lg w-96 border border-gray-200">
                <div className="flex justify-center mb-4">
                    <div className="bg-indigo-100 p-3 rounded-full">
                        <Lock className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
                    Evaluator Login
                </h2>
                <p className="text-center text-gray-500 text-sm mb-6">
                    Enter your credentials to access the assessment
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Email ID
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="annotatorXX_theta@encord.ai"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="password"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Signing In...' : 'Start Assessment'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
