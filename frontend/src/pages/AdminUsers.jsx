import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { User, Users, CheckCircle, Clock, LogOut, Eye, ArrowLeft, Layers, ChevronDown, Filter } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../store';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [tests, setTests] = useState([]);
    const [selectedTestId, setSelectedTestId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, testsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/tests')
            ]);
            setUsers(usersRes.data);
            setTests(testsRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/admin-login');
    };

    // Filter users based on selected test
    const filteredUsers = selectedTestId === 'all'
        ? users
        : users.filter(u => u.test_id === parseInt(selectedTestId));

    const completedCount = filteredUsers.filter(u => u.status === 'Completed').length;
    const inProgressCount = filteredUsers.filter(u => u.status === 'In Progress').length;

    const selectedTest = tests.find(t => t.id === parseInt(selectedTestId));

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-emerald-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">All Users</h1>
                                <p className="text-xs text-emerald-600">AI Test Platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/admin')}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                                <ArrowLeft className="w-4 h-4" /> Dashboard
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-lg shadow-emerald-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{filteredUsers.length}</p>
                                <p className="text-sm text-emerald-600 font-medium">
                                    {selectedTestId === 'all' ? 'Total Users' : 'Users in Batch'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-teal-100 rounded-2xl p-6 shadow-lg shadow-teal-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{completedCount}</p>
                                <p className="text-sm text-teal-600 font-medium">Completed</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-cyan-100 rounded-2xl p-6 shadow-lg shadow-cyan-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{inProgressCount}</p>
                                <p className="text-sm text-amber-600 font-medium">In Progress</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-lg">
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">User Results</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {selectedTestId === 'all'
                                    ? 'View test progress and reports for all users'
                                    : `Showing results for: ${selectedTest?.title || 'Selected Test'}`
                                }
                            </p>
                        </div>

                        {/* Test Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700 transition min-w-[200px] justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    <span className="truncate">
                                        {selectedTestId === 'all' ? 'All Tests' : (selectedTest?.title || 'Select Test')}
                                    </span>
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownOpen && (
                                <>
                                    {/* Backdrop to close dropdown */}
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setDropdownOpen(false)}
                                    />

                                    {/* Dropdown Menu */}
                                    <div className="absolute right-0 mt-2 w-64 bg-white border border-emerald-100 rounded-xl shadow-xl z-20 py-2 max-h-64 overflow-y-auto">
                                        <button
                                            onClick={() => { setSelectedTestId('all'); setDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition flex items-center justify-between ${selectedTestId === 'all' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                                                }`}
                                        >
                                            All Tests
                                            {selectedTestId === 'all' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                                        </button>

                                        <div className="border-t border-gray-100 my-1" />

                                        {tests.map(test => (
                                            <button
                                                key={test.id}
                                                onClick={() => { setSelectedTestId(test.id.toString()); setDropdownOpen(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition flex items-center justify-between ${selectedTestId === test.id.toString() ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate">{test.title}</span>
                                                    {test.is_active && (
                                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">Active</span>
                                                    )}
                                                </div>
                                                {selectedTestId === test.id.toString() && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                            </button>
                                        ))}

                                        {tests.length === 0 && (
                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                                No tests available
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-20">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 mt-4">Loading users...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">
                                {selectedTestId === 'all'
                                    ? 'No users found'
                                    : 'No users have taken this test yet'
                                }
                            </p>
                            {selectedTestId !== 'all' && (
                                <button
                                    onClick={() => setSelectedTestId('all')}
                                    className="mt-4 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                                >
                                    View all users →
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                                    <tr>
                                        <th className="p-4">#</th>
                                        <th className="p-4">User</th>
                                        {selectedTestId === 'all' && <th className="p-4">Test/Batch</th>}
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map((u, idx) => (
                                        <tr key={u.id} className="hover:bg-emerald-50/50 transition">
                                            <td className="p-4 text-gray-400">{idx + 1}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-medium">
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-800">{u.username}</span>
                                                </div>
                                            </td>
                                            {selectedTestId === 'all' && (
                                                <td className="p-4">
                                                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                        {u.test_title || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="p-4">
                                                {u.status === 'Completed' && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full w-fit">
                                                        <CheckCircle className="w-3 h-3" /> Completed
                                                    </span>
                                                )}
                                                {u.status === 'In Progress' && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full w-fit">
                                                        <Clock className="w-3 h-3" /> In Progress
                                                    </span>
                                                )}
                                                {u.status === 'Not Started' && (
                                                    <span className="text-gray-400 text-xs bg-gray-100 px-3 py-1 rounded-full">Pending</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {u.session_id ? (
                                                    <button
                                                        onClick={() => navigate(`/admin/report/${u.session_id}`)}
                                                        className="flex items-center gap-2 text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition ml-auto"
                                                    >
                                                        <Eye className="w-4 h-4" /> View Report
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">No Data</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminUsers;
