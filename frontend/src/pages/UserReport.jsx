import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Play, ExternalLink, RefreshCw, Layers, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const UserReport = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [evaluating, setEvaluating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, [sessionId]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/report/${sessionId}`);
            setReport(res.data);
        } finally {
            setLoading(false);
        }
    };

    const handleEvaluate = async () => {
        setEvaluating(true);
        try {
            await api.post(`/admin/evaluate/${sessionId}`);

            // Auto-refresh periodically to see grades appearing
            const interval = setInterval(() => {
                fetchReport();
            }, 3000);

            // Stop refreshing after 30 seconds
            setTimeout(() => {
                clearInterval(interval);
                setEvaluating(false);
            }, 30000);
        } catch (err) {
            alert("Error starting evaluation");
            setEvaluating(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-600';
        if (score >= 50) return 'text-amber-600';
        return 'text-red-500';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'bg-emerald-50 border-emerald-200';
        if (score >= 50) return 'bg-amber-50 border-amber-200';
        return 'bg-red-50 border-red-200';
    };

    if (loading && !report) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading Report...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-emerald-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/admin/users')}
                                className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                    <Layers className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-800">
                                        Report: <span className="text-teal-600">{report?.user}</span>
                                    </h1>
                                    <p className="text-xs text-emerald-600">AI Test Platform</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={fetchReport}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                            </button>

                            <button
                                onClick={handleEvaluate}
                                disabled={evaluating}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium shadow-lg transition ${evaluating
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25'
                                    }`}
                            >
                                <Play className="w-4 h-4" />
                                {evaluating ? 'AI Grading in Progress...' : 'Evaluate with AI'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Answers List */}
            <main className="max-w-5xl mx-auto p-8 space-y-6">
                {report?.answers?.map((ans, idx) => (
                    <div key={idx} className="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-lg">
                        {/* Header: Task Info */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-800">Task #{ans.question_id}</span>
                            <a
                                href={ans.link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-teal-600 text-sm hover:text-teal-700 transition"
                            >
                                Open Task <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* User Answer Column */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Response</h4>

                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${ans.user_status === 'Success'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-600'
                                        }`}>
                                        {ans.user_status === 'Success'
                                            ? <CheckCircle className="w-3 h-3" />
                                            : <XCircle className="w-3 h-3" />
                                        }
                                        {ans.user_status}
                                    </span>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 border border-gray-100">
                                    {ans.user_explanation || <span className="text-gray-400 italic">No explanation provided</span>}
                                </div>

                                {ans.user_error && (
                                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>Critical Error: {ans.user_error}</span>
                                    </div>
                                )}
                            </div>

                            {/* AI Evaluation Column */}
                            <div className="space-y-4 md:border-l md:pl-8 border-gray-100">
                                <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider">AI Evaluation</h4>

                                {ans.ai_score !== null ? (
                                    <>
                                        <div className={`${getScoreBg(ans.ai_score)} rounded-xl p-4 border`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`text-3xl font-bold ${getScoreColor(ans.ai_score)}`}>
                                                    {ans.ai_score}/100
                                                </div>
                                                <span className="text-xs text-gray-500">Accuracy Score</span>
                                            </div>
                                        </div>

                                        <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl">
                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                {ans.ai_feedback}
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100">
                                            <p className="text-xs text-gray-400">
                                                Matched against Ideal Status:
                                                <span className="font-mono text-gray-600 ml-1">{ans.ideal_status || 'N/A'}</span>
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-100">
                                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                        <span>Not evaluated yet</span>
                                        <span className="text-xs text-gray-300 mt-1">Click "Evaluate with AI"</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {report?.answers?.length === 0 && (
                    <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-emerald-100 shadow-lg">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No answers submitted yet</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserReport;
