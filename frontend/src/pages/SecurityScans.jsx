import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SecurityScans = () => {
  const [repos, setRepos] = useState([]);
  const [scans, setScans] = useState([]);
  
const [sonarData, setSonarData] = useState(null);
const [loadingSonar, setLoadingSonar] = useState(true);
const [sonarError, setSonarError] = useState("");


  const [selectedRepo, setSelectedRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingScans, setLoadingScans] = useState(true);

  const [error, setError] = useState("");

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
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
      setError("Failed to load repositories.");
      setRepos([]);
    }
  };

  // =====================================================
  // FETCH SCANS
  // =====================================================

  const fetchScans = async () => {
    try {
      setLoadingScans(true);

      const response = await axios.get(`${API}/scans`);

      /*
       * Backend response:
       *
       * {
       *   message: "...",
       *   data: [...]
       * }
       *
       * We need response.data.data
       */

      const scanData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setScans(scanData);
    } catch (error) {
      console.error("Failed to fetch scans:", error);
      setScans([]);
      setError("Failed to load security scans.");
    } finally {
      setLoadingScans(false);
    }
  };

  
  // =====================================================
  // FETCH SONARQUBE RESULTS
  // =====================================================

  const fetchSonarResults = async () => {
    try {
      setLoadingSonar(true);
      setSonarError("");

      const response = await axios.get(
        `${API}/scans/sonar/results`
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Invalid SonarQube response");
      }

      setSonarData(response.data.data);
    } catch (error) {
      console.error("Failed to fetch SonarQube results:", error);
      setSonarError("Unable to load SonarQube results.");
      setSonarData(null);
    } finally {
      setLoadingSonar(false);
    }
  };


  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      
await Promise.all([
  fetchRepos(),
  fetchScans(),
  fetchSonarResults(),
]);

    };

    loadData();
  }, []);

  // =====================================================
  // RUN SCAN
  // =====================================================

  const runScan = async () => {
    if (!selectedRepo) {
      setError("Please select a repository first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await axios.post(`${API}/scans/run`, {
        repoId: selectedRepo,
      });

      await fetchScans();

      setSelectedRepo("");
    } catch (error) {
      console.error("Scan failed:", error);

      setError(
        error.response?.data?.message ||
          "Security scan failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LATEST SCAN PER REPOSITORY
  // =====================================================

const latestScans = useMemo(() => {
  if (!Array.isArray(scans)) {
    return [];
  }

  const latestMap = new Map();

  scans
    .filter((scan) => scan.status === "completed")
    .forEach((scan) => {
      const repoId =
        scan.repoId?._id ||
        scan.repoId ||
        scan.repoName;

      if (!repoId) return;

      const scanner = scan.scanner || "npm-audit";
      const key = `${repoId}:${scanner}`;

      const existing = latestMap.get(key);

      if (
        !existing ||
        new Date(scan.createdAt) >
          new Date(existing.createdAt)
      ) {
        latestMap.set(key, scan);
      }
    });

  return Array.from(latestMap.values());
}, [scans]);

        

  // =====================================================
  // ALL FINDINGS FROM LATEST SCANS
  // =====================================================

  const findings = useMemo(() => {
    if (!Array.isArray(latestScans)) {
      return [];
    }

    return latestScans.flatMap((scan) =>
      Array.isArray(scan.findings)
        ? scan.findings.map((finding) => ({
            ...finding,

            repoName:
              scan.repoName ||
              scan.repoId?.repoName ||
              scan.repoId?.name ||
              "Unknown Repository",

            scanDate: scan.createdAt,
          }))
        : []
    );
  }, [latestScans]);

  // =====================================================
  // SEVERITY COUNTS
  // =====================================================

  const severityCounts = useMemo(() => {
    return {
      critical: findings.filter(
        (f) => f.severity === "CRITICAL"
      ).length,

      high: findings.filter(
        (f) => f.severity === "HIGH"
      ).length,

      medium: findings.filter(
        (f) => f.severity === "MEDIUM"
      ).length,

      low: findings.filter(
        (f) => f.severity === "LOW"
      ).length,
    };
  }, [findings]);

  // =====================================================
  // CHART DATA
  // =====================================================

  const chartData = useMemo(() => {
    const data = [
      {
        name: "Critical",
        value: severityCounts.critical,
      },
      {
        name: "High",
        value: severityCounts.high,
      },
      {
        name: "Medium",
        value: severityCounts.medium,
      },
      {
        name: "Low",
        value: severityCounts.low,
      },
    ];

    return data.filter((item) => item.value > 0);
  }, [severityCounts]);

  // =====================================================
  // TOTALS
  // =====================================================

  const totalFindings = findings.length;

  const vulnerableRepositories =
    latestScans.filter(
      (scan) =>
        Array.isArray(scan.findings) &&
        scan.findings.length > 0
    ).length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Security Scans
        </h1>

        <p className="text-slate-400 mt-2">
          Run real npm audit scans against your connected
          repositories and review security findings.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

    
{/* SONARQUBE ANALYSIS */}

<div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div>
      <h2 className="text-xl font-semibold">
        SonarQube Code Analysis
      </h2>
      <p className="text-sm text-slate-400 mt-1">
        Static code analysis and Quality Gate results
      </p>
    </div>

    <button
      type="button"
      onClick={fetchSonarResults}
      disabled={loadingSonar}
      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm disabled:opacity-50"
    >
      {loadingSonar ? "Loading..." : "Refresh Results"}
    </button>
  </div>

  {loadingSonar ? (
    <p className="text-slate-400">
      Loading SonarQube results...
    </p>
  ) : sonarError ? (
    <p className="text-red-400">{sonarError}</p>
  ) : sonarData ? (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-sm text-slate-400">
          Project: {sonarData.projectKey}
        </span>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            sonarData.qualityGate === "OK"
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          Quality Gate: {sonarData.qualityGate}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: "Bugs",
            value: sonarData.metrics?.bugs,
          },
          {
            label: "Vulnerabilities",
            value: sonarData.metrics?.vulnerabilities,
          },
          {
            label: "Security Hotspots",
            value: sonarData.metrics?.securityHotspots,
          },
          {
            label: "Code Smells",
            value: sonarData.metrics?.codeSmells,
          },
          {
            label: "Code Coverage",
            value:
              sonarData.metrics?.coverage == null
                ? "N/A"
                : `${sonarData.metrics.coverage}%`,
          },
          {
            label: "Duplicated Lines",
            value:
              sonarData.metrics?.duplicatedLinesDensity == null
                ? "N/A"
                : `${sonarData.metrics.duplicatedLinesDensity}%`,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4"
          >
            <p className="text-slate-400 text-sm">
              {metric.label}
            </p>

            <p className="text-2xl font-bold mt-2">
              {metric.value ?? "N/A"}
            </p>
          </div>
        ))}
      </div>
    </>
  ) : (
    <p className="text-slate-400">
      No SonarQube results available.
    </p>
  )}
</div>


      {/* SCAN CONTROLS */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selectedRepo}
            onChange={(e) =>
              setSelectedRepo(e.target.value)
            }
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
          >
            <option value="">
              Select repository
            </option>

            {repos.map((repo) => (
              <option
                key={repo._id}
                value={repo._id}
              >
                {repo.repoName ||
                  `${repo.owner}/${repo.name}`}
              </option>
            ))}
          </select>

          <button
            onClick={runScan}
            disabled={loading || !selectedRepo}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading
              ? "Scanning..."
              : "Run Security Scan"}
          </button>
        </div>

        {loading && (
          <p className="text-sm text-slate-400 mt-3">
            Cloning repository and running npm audit.
            This may take a little while...
          </p>
        )}
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">
            Latest Scans
          </p>

          <p className="text-3xl font-bold mt-2">
            {latestScans.length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">
            Total Findings
          </p>

          <p className="text-3xl font-bold mt-2">
            {totalFindings}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">
            Critical / High
          </p>

          <p className="text-3xl font-bold mt-2">
            {severityCounts.critical +
              severityCounts.high}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">
            Affected Repositories
          </p>

          <p className="text-3xl font-bold mt-2">
            {vulnerableRepositories}
          </p>
        </div>
      </div>

      {/* CHART */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Vulnerability Severity
        </h2>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500">
            No vulnerabilities detected.
          </div>
        ) : (
          <div className="w-full h-72 min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={250}
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {chartData.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* SCAN HISTORY */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-xl font-semibold">
            Latest Repository Scans
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Showing the latest completed scan for each repository and scanner.
          </p>
        </div>

        {loadingScans ? (
          <div className="p-8 text-center text-slate-400">
            Loading scans...
          </div>
        ) : latestScans.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No security scans available yet.
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
  Scanner
</th>


                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Findings
                  </th>

                  <th className="px-5 py-4">
                    Critical
                  </th>

                  <th className="px-5 py-4">
                    High
                  </th>

                  <th className="px-5 py-4">
                    Medium
                  </th>

                  <th className="px-5 py-4">
                    Low
                  </th>

                  <th className="px-5 py-4">
                    Scanned
                  </th>
                </tr>
              </thead>

              <tbody>
                {latestScans.map((scan) => {
                  const scanFindings =
                    Array.isArray(scan.findings)
                      ? scan.findings
                      : [];

                  const critical =
                    scanFindings.filter(
                      (f) =>
                        f.severity ===
                        "CRITICAL"
                    ).length;

                  const high =
                    scanFindings.filter(
                      (f) =>
                        f.severity === "HIGH"
                    ).length;

                  const medium =
                    scanFindings.filter(
                      (f) =>
                        f.severity === "MEDIUM"
                    ).length;

                  const low =
                    scanFindings.filter(
                      (f) =>
                        f.severity === "LOW"
                    ).length;

                  return (
                    <tr
                      key={scan._id}
                      className="border-b border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-medium">
                        {scan.repoName ||
                          scan.repoId?.repoName ||
                          "Unknown Repository"}
                      </td>

                      
<td className="px-5 py-4">
  <span className="inline-block rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-sm text-slate-200">
    {(scan.scanner || "npm-audit") === "trivy"
      ? "Trivy"
      : "npm audit"}
  </span>
</td>


                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            scan.status ===
                            "completed"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {scan.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {scanFindings.length}
                      </td>

                      <td className="px-5 py-4 text-red-400">
                        {critical}
                      </td>

                      <td className="px-5 py-4 text-orange-400">
                        {high}
                      </td>

                      <td className="px-5 py-4 text-yellow-400">
                        {medium}
                      </td>

                      <td className="px-5 py-4 text-blue-400">
                        {low}
                      </td>

                      <td className="px-5 py-4 text-slate-400 text-sm">
                        {scan.createdAt
                          ? new Date(
                              scan.createdAt
                            ).toLocaleString()
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityScans;


