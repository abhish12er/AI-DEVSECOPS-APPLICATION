import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Pipelines() {
  const [pipelines, setPipelines] = useState([]);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =====================================================
  // FETCH PIPELINES
  // =====================================================

  const fetchPipelines = async () => {
    try {
      setError("");

      const response = await axios.get(`${API}/pipelines`);

      const pipelineData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setPipelines(pipelineData);
    } catch (error) {
      console.error("Failed to fetch pipelines:", error);

      setPipelines([]);

      setError(
        error.response?.data?.message ||
          "Failed to load pipeline history."
      );
    }
  };

  // =====================================================
  // FETCH REPOSITORIES
  // =====================================================

  const fetchRepos = async () => {
    try {
      const response = await axios.get(`${API}/repos`);

      const repoData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setRepos(repoData);

      if (repoData.length > 0) {
        setSelectedRepo((current) => current || repoData[0]._id);
      }
    } catch (error) {
      console.error("Failed to fetch repositories:", error);

      setRepos([]);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        await Promise.all([
          fetchPipelines(),
          fetchRepos(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // =====================================================
  // RUN PIPELINE
  // =====================================================

  const runPipeline = async () => {
    if (!selectedRepo) {
      setError("Please select a repository.");
      return;
    }

    try {
      setRunning(true);
      setError("");
      setMessage("");

      const response = await axios.post(
        `${API}/pipelines/run`,
        {
          repoId: selectedRepo,
        }
      );

      setMessage(
        response.data?.message ||
          "Pipeline completed."
      );

      await fetchPipelines();
    } catch (error) {
      console.error("Pipeline execution failed:", error);

      // A security-gate failure currently comes back as a
      // normal pipeline result, but this also handles real
      // request/server errors.
      setError(
        error.response?.data?.message ||
          "Pipeline execution failed."
      );

      await fetchPipelines();
    } finally {
      setRunning(false);
    }
  };

  // =====================================================
  // PIPELINE STATISTICS
  // =====================================================

  const stats = useMemo(() => {
    return {
      total: pipelines.length,

      success: pipelines.filter(
        (pipeline) => pipeline.status === "success"
      ).length,

      failed: pipelines.filter(
        (pipeline) => pipeline.status === "failed"
      ).length,

      blocked: pipelines.filter(
        (pipeline) => pipeline.auditStatus === "failed"
      ).length,
    };
  }, [pipelines]);

  // =====================================================
  // STATUS STYLING
  // =====================================================

  const getStatusClass = (status) => {
    switch (status) {
      case "success":
      case "passed":
      case "deployed":
        return "bg-green-500/10 text-green-400 border-green-500/30";

      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/30";

      case "running":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";

      case "skipped":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";

      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const formatDuration = (duration) => {
    if (
      duration === null ||
      duration === undefined
    ) {
      return "—";
    }

    if (duration < 1000) {
      return `${duration} ms`;
    }

    return `${(duration / 1000).toFixed(2)} s`;
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleString();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-400">
            Loading pipelines...
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">

      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          CI/CD Pipelines
        </h1>

        <p className="text-slate-400 mt-2">
          Run and monitor security-gated CI/CD
          pipelines for connected repositories.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* MESSAGE */}

      {message && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg p-4">
          {message}
        </div>
      )}

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">
            Total Pipelines
          </p>

          <p className="text-3xl font-bold mt-2">
            {stats.total}
          </p>
        </div>

        <div className="bg-slate-900 border border-green-500/20 rounded-xl p-5">
          <p className="text-sm text-green-400">
            Successful
          </p>

          <p className="text-3xl font-bold mt-2 text-green-400">
            {stats.success}
          </p>
        </div>

        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">
          <p className="text-sm text-red-400">
            Failed
          </p>

          <p className="text-3xl font-bold mt-2 text-red-400">
            {stats.failed}
          </p>
        </div>

        <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-5">
          <p className="text-sm text-orange-400">
            Security Gate Blocks
          </p>

          <p className="text-3xl font-bold mt-2 text-orange-400">
            {stats.blocked}
          </p>
        </div>
      </div>

      {/* RUN PIPELINE */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">

          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">
              Repository
            </label>

            <select
              value={selectedRepo}
              onChange={(e) =>
                setSelectedRepo(e.target.value)
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              {repos.length === 0 ? (
                <option value="">
                  No repositories available
                </option>
              ) : (
                repos.map((repo) => (
                  <option
                    key={repo._id}
                    value={repo._id}
                  >
                    {repo.repoName}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={runPipeline}
            disabled={
              running ||
              !selectedRepo
            }
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed font-medium transition"
          >
            {running
              ? "Running Pipeline..."
              : "Run Pipeline"}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Security Gate: pipelines are blocked when
          CRITICAL or HIGH vulnerabilities are present.
        </div>
      </div>

      {/* PIPELINE HISTORY */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        <div className="p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold">
            Pipeline History
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Real pipeline executions stored by the backend.
          </p>
        </div>

        {pipelines.length === 0 ? (
          <div className="p-12 text-center">

            <div className="text-4xl mb-4">
              ⚙️
            </div>

            <h2 className="text-xl font-semibold">
              No pipeline runs yet
            </h2>

            <p className="text-slate-400 mt-2">
              Select a repository and run your first
              security-gated pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                  <th className="px-5 py-4">
                    Repository
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Security Gate
                  </th>

                  <th className="px-5 py-4">
                    Vulnerabilities
                  </th>

                  <th className="px-5 py-4">
                    Build
                  </th>

                  <th className="px-5 py-4">
                    Deployment
                  </th>

                  <th className="px-5 py-4">
                    Duration
                  </th>

                  <th className="px-5 py-4">
                    Started
                  </th>

                </tr>
              </thead>

              <tbody>
                {pipelines.map((pipeline) => (
                  <tr
                    key={pipeline._id}
                    className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                  >

                    {/* REPOSITORY */}

                    <td className="px-5 py-4">

                      <div className="font-medium">
                        {pipeline.repoName ||
                          pipeline.repoId?.repoName ||
                          "Unknown Repository"}
                      </div>

                      {pipeline.repoId?.owner && (
                        <div className="text-xs text-slate-500 mt-1">
                          {pipeline.repoId.owner}
                        </div>
                      )}

                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold uppercase ${getStatusClass(
                          pipeline.status
                        )}`}
                      >
                        {pipeline.status}
                      </span>

                    </td>

                    {/* SECURITY */}

                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold uppercase ${getStatusClass(
                          pipeline.auditStatus
                        )}`}
                      >
                        {pipeline.auditStatus}
                      </span>

                    </td>

                    {/* VULNERABILITIES */}

                    <td className="px-5 py-4">

                      <div className="font-medium">
                        {pipeline.vulnerabilities?.total ??
                          0}{" "}
                        total
                      </div>

                      <div className="text-xs mt-1 flex flex-wrap gap-2">

                        <span className="text-red-400">
                          C:{" "}
                          {pipeline.vulnerabilities
                            ?.critical ?? 0}
                        </span>

                        <span className="text-orange-400">
                          H:{" "}
                          {pipeline.vulnerabilities
                            ?.high ?? 0}
                        </span>

                        <span className="text-yellow-400">
                          M:{" "}
                          {pipeline.vulnerabilities
                            ?.medium ?? 0}
                        </span>

                        <span className="text-blue-400">
                          L:{" "}
                          {pipeline.vulnerabilities
                            ?.low ?? 0}
                        </span>

                      </div>

                    </td>

                    {/* BUILD */}

                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold uppercase ${getStatusClass(
                          pipeline.buildStatus
                        )}`}
                      >
                        {pipeline.buildStatus}
                      </span>

                    </td>

                    {/* DEPLOYMENT */}

                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold uppercase ${getStatusClass(
                          pipeline.deploymentStatus
                        )}`}
                      >
                        {pipeline.deploymentStatus}
                      </span>

                    </td>

                    {/* DURATION */}

                    <td className="px-5 py-4 text-slate-300">
                      {formatDuration(
                        pipeline.duration
                      )}
                    </td>

                    {/* DATE */}

                    <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {formatDate(
                        pipeline.startedAt
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}
      </div>
    </div>
  );
}