import { useState } from "react";
import API from "../api";

export default function AISecurityAdvisor({ repoId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateAnalysis = async () => {
    if (!repoId) {
      setError("Please select a repository first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAnalysis(null);

      const res = await API.post("/scans/analyze", {
        repoId,
      });

      setAnalysis(res.data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to analyze repository security."
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskStyle = (riskLevel) => {
    if (riskLevel === "High") {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }

    if (riskLevel === "Medium") {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }

    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>
          <h2 className="text-2xl font-bold">
            AI Security Advisor
          </h2>

          <p className="text-slate-400 text-sm mt-1">
            Analyze security findings and get remediation recommendations.
          </p>
        </div>

        <button
          onClick={generateAnalysis}
          disabled={loading || !repoId}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg font-medium transition"
        >
          {loading ? "Analyzing..." : "Analyze Security"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Analysis */}
      {analysis && (
        <div className="space-y-6">

          {/* Risk Level */}
          <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-lg p-5">
            <div>
              <p className="text-sm text-slate-400">
                Overall Risk Level
              </p>

              <p className="text-lg font-semibold mt-1">
                Security Analysis
              </p>
            </div>

            <span
              className={`px-4 py-2 rounded-lg border font-semibold ${getRiskStyle(
                analysis.riskLevel
              )}`}
            >
              {analysis.riskLevel} Risk
            </span>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-400">
                Total
              </p>

              <p className="text-2xl font-bold mt-1">
                {analysis.statistics.total}
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-400">
                High
              </p>

              <p className="text-2xl font-bold mt-1">
                {analysis.statistics.high}
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-yellow-400">
                Medium
              </p>

              <p className="text-2xl font-bold mt-1">
                {analysis.statistics.medium}
              </p>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-400">
                Low
              </p>

              <p className="text-2xl font-bold mt-1">
                {analysis.statistics.low}
              </p>
            </div>

          </div>

          {/* Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Security Summary
            </h3>

            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-slate-300">
              {analysis.summary}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Recommended Actions
            </h3>

            <div className="space-y-3">
              {analysis.recommendations.map(
                (recommendation, index) => (
                  <div
                    key={index}
                    className="flex gap-3 bg-slate-800/60 border border-slate-700 rounded-lg p-4"
                  >
                    <span className="text-purple-400 font-bold">
                      {index + 1}
                    </span>

                    <p className="text-slate-300">
                      {recommendation}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && !error && (
        <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-6 text-center">
          <p className="text-slate-400">
            Select a repository and run the security analysis.
          </p>
        </div>
      )}
    </div>
  );
}