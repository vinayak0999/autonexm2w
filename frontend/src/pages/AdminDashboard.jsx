import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
    Plus, Upload, FileText, Users, Link, X, BarChart, LogOut, Trash2,
    Power, Eye, CheckCircle, Clock, HelpCircle, ChevronDown, ChevronUp,
    FileSpreadsheet, AlertTriangle, Activity, Layers, Award
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../store';

const AdminDashboard = () => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [results, setResults] = useState([]);
    const [newTest, setNewTest] = useState({ title: '', duration: 360 });
    const [newTaskId, setNewTaskId] = useState('');
    const [newQuestionUrl, setNewQuestionUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [addingQuestion, setAddingQuestion] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/tests');
            setTests(res.data);
        } catch (err) {
            console.error("Failed to fetch tests", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTest = async () => {
        if (!newTest.title) {
            alert("Please enter a test title");
            return;
        }
        setActionLoading('create');
        try {
            await api.post('/admin/create-test', {
                title: newTest.title,
                duration_minutes: parseInt(newTest.duration),
                description: ""
            });
            setShowCreateModal(false);
            setNewTest({ title: '', duration: 360 });
            fetchTests();
        } finally {
            setActionLoading(null);
        }
    };

    const handleActivateTest = async (testId) => {
        setActionLoading(`activate-${testId}`);
        try {
            await api.post(`/admin/test/${testId}/activate`);
            fetchTests();
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeactivateTest = async (testId) => {
        setActionLoading(`deactivate-${testId}`);
        try {
            await api.post(`/admin/test/${testId}/deactivate`);
            fetchTests();
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteTest = async (testId) => {
        setActionLoading(`delete-${testId}`);
        try {
            await api.delete(`/admin/test/${testId}`);
            setShowDeleteConfirm(null);
            fetchTests();
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewQuestions = async (test) => {
        setSelectedTest(test);
        try {
            const res = await api.get(`/admin/test/${test.id}/questions`);
            setQuestions(res.data);
            setShowQuestionsModal(true);
        } catch (err) {
            alert("Failed to load questions");
        }
    };

    const handleViewResults = async (test) => {
        setSelectedTest(test);
        try {
            const res = await api.get(`/admin/test/${test.id}/results`);
            setResults(res.data);
            setShowResultsModal(true);
        } catch (err) {
            alert("Failed to load results");
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        try {
            await api.delete(`/admin/question/${questionId}`);
            setQuestions(questions.filter(q => q.id !== questionId));
        } catch (err) {
            alert("Failed to delete question");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedTest) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/admin/test/${selectedTest.id}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowUploadModal(false);
            fetchTests();
        } catch (err) {
            alert(err.response?.data?.detail || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleAddQuestion = async () => {
        if (!newQuestionUrl || !selectedTest) return;
        setAddingQuestion(true);
        try {
            await api.post(`/admin/test/${selectedTest.id}/add-question`, {
                task_id: newTaskId || null,
                link: newQuestionUrl
            });
            setNewTaskId('');
            setNewQuestionUrl('');
            const res = await api.get(`/admin/test/${selectedTest.id}/questions`);
            setQuestions(res.data);
            fetchTests();
        } catch (err) {
            alert("Failed to add question");
        } finally {
            setAddingQuestion(false);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    // Stats
    const totalQuestions = tests.reduce((sum, t) => sum + (t.question_count || 0), 0);
    const activeTest = tests.find(t => t.is_active);

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
                                <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                                <p className="text-xs text-emerald-600">AI Test Platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/admin/users')}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                                <Users className="w-4 h-4" /> All Users
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
                                <FileText className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{tests.length}</p>
                                <p className="text-sm text-emerald-600 font-medium">Total Tests</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-teal-100 rounded-2xl p-6 shadow-lg shadow-teal-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                                <Activity className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{activeTest ? 1 : 0}</p>
                                <p className="text-sm text-teal-600 font-medium">Active Test</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-cyan-100 rounded-2xl p-6 shadow-lg shadow-cyan-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                                <HelpCircle className="w-6 h-6 text-cyan-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{totalQuestions}</p>
                                <p className="text-sm text-cyan-600 font-medium">Total Questions</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header with Create Button */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Test Management</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/25 transition-all"
                    >
                        <Plus className="w-5 h-5" /> Create New Test
                    </button>
                </div>

                {/* Tests List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-500 mt-4">Loading tests...</p>
                    </div>
                ) : tests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-emerald-100 shadow-lg">
                        <FileText className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-500 mb-2">No Tests Yet</h3>
                        <p className="text-gray-400">Create your first test to get started</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tests.map((test) => (
                            <div
                                key={test.id}
                                className={`bg-white border rounded-2xl p-6 transition-all shadow-lg ${test.is_active
                                    ? 'border-emerald-300 shadow-emerald-500/10'
                                    : 'border-gray-100 hover:border-emerald-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${test.is_active
                                            ? 'bg-emerald-100'
                                            : 'bg-gray-100'
                                            }`}>
                                            <FileText className={`w-6 h-6 ${test.is_active ? 'text-emerald-600' : 'text-gray-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-800">{test.title}</h3>
                                                {test.is_active && (
                                                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                                        ACTIVE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {Math.floor(test.duration_minutes / 60)}h {test.duration_minutes % 60}m
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <HelpCircle className="w-4 h-4" />
                                                    {test.question_count} questions
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => setShowDeleteConfirm(test)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Delete Test"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
                                    {test.is_active ? (
                                        <button
                                            onClick={() => handleDeactivateTest(test.id)}
                                            disabled={actionLoading === `deactivate-${test.id}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
                                        >
                                            <Power className="w-4 h-4" /> Deactivate
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleActivateTest(test.id)}
                                            disabled={actionLoading === `activate-${test.id}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                                        >
                                            <Power className="w-4 h-4" /> Activate
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setSelectedTest(test); setShowUploadModal(true); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
                                    >
                                        <Upload className="w-4 h-4" /> Upload Excel
                                    </button>
                                    <button
                                        onClick={() => handleViewQuestions(test)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
                                    >
                                        <Eye className="w-4 h-4" /> Questions
                                    </button>
                                    <button
                                        onClick={() => handleViewResults(test)}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition"
                                    >
                                        <BarChart className="w-4 h-4" /> View Results
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Test Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-emerald-100 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Create New Test</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Test Name / Batch</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Batch 1 - March 2024"
                                    value={newTest.title}
                                    onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                                <input
                                    type="number"
                                    value={newTest.duration}
                                    onChange={(e) => setNewTest({ ...newTest, duration: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTest}
                                disabled={actionLoading === 'create'}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition disabled:opacity-50"
                            >
                                {actionLoading === 'create' ? 'Creating...' : 'Create Test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal with Excel Guide */}
            {showUploadModal && selectedTest && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-emerald-100 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Upload Questions - {selectedTest.title}</h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Excel Format Guide */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-2 text-emerald-700 mb-3">
                                <FileSpreadsheet className="w-5 h-5" />
                                <span className="font-semibold">Required Excel Format</span>
                            </div>
                            <div className="bg-white rounded-lg p-3 font-mono text-xs overflow-x-auto border border-emerald-100">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-gray-500 border-b border-gray-200">
                                            <th className="pb-2 pr-4">task_id</th>
                                            <th className="pb-2">link</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-700">
                                        <tr className="border-b border-gray-100">
                                            <td className="py-2 pr-4">Q001</td>
                                            <td className="py-2 text-teal-600">https://example.com/task1</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-2 pr-4">Q002</td>
                                            <td className="py-2 text-teal-600">https://example.com/task2</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4">Q003</td>
                                            <td className="py-2 text-teal-600">https://example.com/task3</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 text-xs text-gray-600 space-y-1">
                                <p>• <span className="text-emerald-600 font-medium">link</span> column is <span className="text-emerald-600">required</span></p>
                                <p>• <span className="text-teal-600 font-medium">task_id</span> column is optional (for reference)</p>
                            </div>
                        </div>

                        {/* Upload Area */}
                        <label className="block">
                            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${uploading
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                                }`}>
                                {uploading ? (
                                    <div>
                                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-gray-600">Uploading...</p>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-700 font-medium">Click to select Excel file</p>
                                        <p className="text-sm text-gray-400 mt-1">.xlsx or .xls files</p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>

                        {/* Add Single Question */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-3">Or add a single question:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Task ID (optional)"
                                    value={newTaskId}
                                    onChange={(e) => setNewTaskId(e.target.value)}
                                    className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Task URL"
                                    value={newQuestionUrl}
                                    onChange={(e) => setNewQuestionUrl(e.target.value)}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500"
                                />
                                <button
                                    onClick={handleAddQuestion}
                                    disabled={!newQuestionUrl || addingQuestion}
                                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                                >
                                    {addingQuestion ? '...' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Questions Modal */}
            {showQuestionsModal && selectedTest && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-emerald-100 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Questions - {selectedTest.title}</h3>
                            <button onClick={() => setShowQuestionsModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {questions.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    No questions added yet
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {questions.map((q, idx) => (
                                        <div key={q.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            <span className="text-sm font-mono text-gray-400 w-16">
                                                {q.task_id || `#${idx + 1}`}
                                            </span>
                                            <a
                                                href={q.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 text-sm text-teal-600 hover:text-teal-700 truncate"
                                            >
                                                {q.link}
                                            </a>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* View Results Modal (Batch Tracking) */}
            {showResultsModal && selectedTest && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-emerald-100 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Results - {selectedTest.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">Users who took this test</p>
                            </div>
                            <button onClick={() => setShowResultsModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {results.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No users have taken this test yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {results.map((r) => (
                                        <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-medium">
                                                    {r.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-gray-800 font-medium">{r.username}</p>
                                                    <p className="text-xs text-gray-500">Progress: {r.current_index} questions</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {r.is_completed ? (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                                                        <CheckCircle className="w-4 h-4" /> Completed
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                                                        <Clock className="w-4 h-4" /> In Progress
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => { setShowResultsModal(false); navigate(`/admin/report/${r.id}`); }}
                                                    className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-lg transition"
                                                >
                                                    View Report
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-red-100 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Delete Test?</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-100">
                            <p className="text-gray-700">
                                Are you sure you want to delete <span className="font-bold text-gray-800">"{showDeleteConfirm.title}"</span>?
                            </p>
                            <p className="text-sm text-red-600 mt-2">
                                This will also delete all {showDeleteConfirm.question_count} questions and user results.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteTest(showDeleteConfirm.id)}
                                disabled={actionLoading === `delete-${showDeleteConfirm.id}`}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition disabled:opacity-50"
                            >
                                {actionLoading === `delete-${showDeleteConfirm.id}` ? 'Deleting...' : 'Delete Test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
