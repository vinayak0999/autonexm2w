import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { loginSuccess } from '../store';
import { Shield, Mail, Key } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Authenticate
            const res = await api.post('/login', {
                username: email,
                password: password
            });
            const userData = res.data;

            // Check if user is admin
            const userCheck = await api.get(`/admin/check/${userData.user_id}`);

            if (!userCheck.data.is_admin) {
                setError('Access Denied: You are not an administrator');
                setLoading(false);
                return;
            }

            // Save admin to Redux
            dispatch(loginSuccess({
                user: {
                    username: userData.username,
                    id: userData.user_id,
                    is_admin: true
                },
                token: userData.access_token
            }));

            // Redirect to Admin Dashboard
            navigate('/admin');

        } catch (err) {
            setError(err.response?.data?.detail || 'Login Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-96 border border-gray-200">
                <div className="flex justify-center mb-4">
                    <div className="bg-red-100 p-3 rounded-full">
                        <Shield className="w-6 h-6 text-red-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
                    Admin Access
                </h2>
                <p className="text-center text-gray-500 text-sm mb-6">
                    Restricted area - Administrators only
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAdminLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Admin Email / Username
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                placeholder="admin"
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
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                placeholder="Enter admin password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition shadow-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Authenticating...' : 'Access Admin Panel'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
                        ← Back to User Login
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
