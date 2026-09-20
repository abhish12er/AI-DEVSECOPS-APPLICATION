
import { useEffect, useState } from "react";
import API from "../api";
import SecurityChart from "../components/SecurityChart";
import VulnerabilityModal from "../components/VulnerabilityModal";
import AISecurityAdvisor from "../components/AISecurityAdvisor";

export default function SecurityScans() {
  const [repos, setRepos] = useState([]);
  const [scans, setScans] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [securityScore, setSecurityScore] = useState(100);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [scanningRepo, setScanningRepo] = useState(null);

  const [stats, setStats] = useState({
    totalScans: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  const fetchRepos = async () => {
    try {
      const res = await API.get("/repos");
      setRepos(res.data);
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
    }
  };

  const fetchScans = async () => {
    try {
      const res = await API.get("/scans");

      const scanData = res.data || [];
      setScans(scanData);

      let high = 0;
      let medium = 0;
      let low = 0;

      scanData.forEach((scan) => {
        if (scan.findings) {
          scan.findings.forEach((finding) => {
            if (finding.severity === "HIGH") {
              high++;
            } else if (finding.severity === "MEDIUM") {
              medium++;
            } else if (finding.severity === "LOW") {
              low++;
            }
          });
        }
      });

      setStats({
        totalScans: scanData.length,
        high,
        medium,
        low,
      });

      const riskPoints =
        high * 10 +
        medium * 5 +
        low;

      const score = Math.max(100 - riskPoints, 0);

      setSecurityScore(score);
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    }
  };

  const runScan = async (repoId) => {
    try {
      setScanningRepo(repoId);

      console.log("Starting scan:", repoId);

      await API.post("/scans/run", {
        repoId: repoId,
      });

      await fetchScans();

      alert("Security scan completed successfully!");
    } catch (err) {
      console.error("SCAN ERROR:", err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Scan failed"
      );
    } finally {
      setScanningRepo(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchRepos(),
        fetchScans(),
      ]);
    };

    loadData();
  }, []);

  const riskLevel =
    securityScore >= 80
      ? "Low Risk"
      : securityScore >= 50
      ? "Medium Risk"
      : "High Risk";

  const getRepoName = (scan) => {
    if (scan.repoId && scan.repoId.repoName) {
      return scan.repoId.repoName;
    }

    if (scan.repository && scan.repository.repoName) {
      return scan.repository.repoName;
    }

    return "Unknown Repository";
  };

  const allFindings = scans.flatMap((scan) => {
    return (scan.findings || []).map((finding) => {
      return {
        ...finding,
        repositoryName: getRepoName(scan),
        scanId: scan._id,
        scanDate: scan.createdAt,
      };
    });
  });

  const filteredAllFindings =
    filter === "ALL"
      ? allFindings
      : allFindings.filter(
          (finding) => finding.severity === filter
        );

  return (
    <div className="p-8 text-white">

      {/* PAGE TITLE */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Security Scans
        </h1>

        <p className="text-slate-400 mt-2">
          Real-time dependency vulnerability scanning
          powered by npm audit.
        </p>
      </div>

      {/* SECURITY OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-sm">
            Total Scans
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {stats.totalScans}
          </h2>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-red-800">
          <p className="text-red-400 text-sm">
            High Severity
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {stats.high}
          </h2>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-yellow-700">
          <p className="text-yellow-400 text-sm">
            Medium Severity
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {stats.medium}
          </h2>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-green-700">
          <p className="text-green-400 text-sm">
            Low Severity
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {stats.low}
          </h2>
        </div>

      </div>

      {/* SECURITY SCORE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-slate-400 text-sm">
              Overall Security Score
            </p>

            <h2 className="text-5xl font-bold mt-2">
              {securityScore}/100
            </h2>

            <p
              className={`mt-3 font-medium ${
                riskLevel === "Low Risk"
                  ? "text-green-400"
                  : riskLevel === "Medium Risk"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {riskLevel}
            </p>
          </div>

          <div className="text-6xl">
            🛡️
          </div>

        </div>
      </div>

      {/* SECURITY CHART */}
      <SecurityChart
        high={stats.high}
        medium={stats.medium}
        low={stats.low}
      />

      {/* REPOSITORIES */}
      <div className="mb-10">

        <h2 className="text-xl mb-4">
          Repositories
        </h2>

        {repos.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
            No repositories connected yet.
          </div>

        ) : (

          <div className="grid gap-4">

            {repos.map((repo) => (

              <div
                key={repo._id}
                className="bg-slate-900 p-4 rounded-lg flex justify-between items-center border border-slate-800"
              >

                <div>
                  <p className="font-semibold">
                    {repo.repoName}
                  </p>

                  <p className="text-sm text-slate-500">
                    {repo.owner}
                  </p>
                </div>

                <button
                  onClick={() => runScan(repo._id)}
                  disabled={scanningRepo === repo._id}
                  className={`px-4 py-2 rounded-lg transition ${
                    scanningRepo === repo._id
                      ? "bg-slate-700 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {scanningRepo === repo._id
                    ? "Scanning..."
                    : "Run Scan"}
                </button>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* SEVERITY FILTER */}
      <div className="flex gap-3 mb-6 flex-wrap">

        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-lg ${
            filter === "ALL"
              ? "bg-blue-600"
              : "bg-slate-800"
          }`}
        >
          All
        </button>

        <button
          onClick={() => setFilter("HIGH")}
          className={`px-4 py-2 rounded-lg ${
            filter === "HIGH"
              ? "bg-red-600"
              : "bg-slate-800"
          }`}
        >
          High
        </button>

        <button
          onClick={() => setFilter("MEDIUM")}
          className={`px-4 py-2 rounded-lg ${
            filter === "MEDIUM"
              ? "bg-yellow-600"
              : "bg-slate-800"
          }`}
        >
          Medium
        </button>

        <button
          onClick={() => setFilter("LOW")}
          className={`px-4 py-2 rounded-lg ${
            filter === "LOW"
              ? "bg-green-600"
              : "bg-slate-800"
          }`}
        >
          Low
        </button>

      </div>

      {/* SCAN RESULTS */}
      <div>

        <h2 className="text-xl mb-4">
          Scan Results
        </h2>

        {scans.length === 0 ? (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
            No security scans have been performed yet.
          </div>

        ) : (

          <div className="grid gap-4">

            {scans.map((scan) => {

              const findings = scan.findings || [];

              const filteredFindings =
                filter === "ALL"
                  ? findings
                  : findings.filter(
                      (finding) =>
                        finding.severity === filter
                    );

              if (filteredFindings.length === 0) {
                return null;
              }

              return (
                <div
                  key={scan._id}
                  className="bg-slate-900 p-4 rounded-lg border border-slate-800"
                >

                  <div className="flex justify-between items-center mb-4">

                    <div>
                      <p className="text-lg font-bold">
                        📦 {getRepoName(scan)}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {scan.createdAt
                          ? new Date(
                              scan.createdAt
                            ).toLocaleString()
                          : "Timestamp unavailable"}
                      </p>
                    </div>

                    <span className="text-sm text-slate-400">
                      {filteredFindings.length} findings
                    </span>

                  </div>

                  {filteredFindings.map(
                    (finding, index) => (

                      <div
                        key={
                          finding._id ||
                          `${scan._id}-${index}`
                        }
                        onClick={() =>
                          setSelectedFinding(finding)
                        }
                        className="border border-slate-700 rounded p-3 mb-3 cursor-pointer hover:border-blue-500 transition"
                      >

                        <div className="flex items-center justify-between">

                          <p className="font-medium">
                            {finding.title}
                          </p>

                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              finding.severity === "HIGH"
                                ? "bg-red-500/20 text-red-400"
                                : finding.severity === "MEDIUM"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {finding.severity}
                          </span>

                        </div>

                        <p className="text-sm text-slate-400 mt-1 break-all">
                          {finding.cve || "N/A"}
                        </p>

                        <p className="text-slate-400 text-sm mt-1">
                          CVSS Score:{" "}
                          {finding.score ?? "N/A"}
                        </p>

                        <p className="text-slate-300 text-sm mt-2">
                          💡 {finding.recommendation}
                        </p>

                      </div>

                    )
                  )}

                </div>
              );
            })}

          </div>

        )}

      </div>

      {/* VULNERABILITY TABLE */}
      <div className="mt-10">

        <h2 className="text-2xl font-bold mb-4">
          Vulnerability Table
        </h2>

        <div className="overflow-x-auto">

          <table className="w-full bg-slate-900 rounded-xl overflow-hidden">

            <thead className="bg-slate-800">

              <tr>

                <th className="text-left p-4">
                  Severity
                </th>

                <th className="text-left p-4">
                  Advisory
                </th>

                <th className="text-left p-4">
                  Title
                </th>

                <th className="text-left p-4">
                  Score
                </th>

                <th className="text-left p-4">
                  Repository
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredAllFindings.length === 0 ? (

                <tr>

                  <td
                    colSpan="5"
                    className="p-8 text-center text-slate-400"
                  >
                    No vulnerabilities found.
                  </td>

                </tr>

              ) : (

                filteredAllFindings.map(
                  (finding, index) => (

                    <tr
                      key={
                        finding._id ||
                        `${finding.scanId}-${index}`
                      }
                      onClick={() =>
                        setSelectedFinding(finding)
                      }
                      className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer transition"
                    >

                      <td className="p-4">

                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            finding.severity === "HIGH"
                              ? "bg-red-500/20 text-red-400"
                              : finding.severity === "MEDIUM"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {finding.severity}
                        </span>

                      </td>

                      <td className="p-4 text-sm text-slate-300 break-all">
                        {finding.cve || "N/A"}
                      </td>

                      <td className="p-4">
                        {finding.title}
                      </td>

                      <td className="p-4">
                        {finding.score ?? "N/A"}
                      </td>

                      <td className="p-4 text-blue-400">
                        {finding.repositoryName}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* AI SECURITY ANALYSIS */}
      <div className="mt-10">

        <h2 className="text-2xl font-bold mb-4">
          AI Security Analysis
        </h2>

        <select
          value={selectedRepoId}
          onChange={(e) =>
            setSelectedRepoId(e.target.value)
          }
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white mb-4"
        >

          <option value="">
            Select repository for AI analysis
          </option>

          {repos.map((repo) => (

            <option
              key={repo._id}
              value={repo._id}
            >
              {repo.repoName}
            </option>

          ))}

        </select>

        {selectedRepoId && (
          <AISecurityAdvisor
            repoId={selectedRepoId}
          />
        )}

      </div>

      {/* SCAN HISTORY */}
      <div className="mt-10">

        <h2 className="text-2xl font-bold mb-6">
          Recent Security Activity
        </h2>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">

          {scans.length === 0 ? (

            <p className="text-slate-400">
              No scan activity found.
            </p>

          ) : (

            scans.map((scan) => (

              <div
                key={scan._id}
                className="flex gap-4 mb-6 last:mb-0"
              >

                <div className="flex flex-col items-center">

                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>

                  <div className="w-px h-full bg-slate-700"></div>

                </div>

                <div>

                  <p className="font-semibold">
                    Security scan completed for{" "}

                    <span className="text-blue-400">
                      {getRepoName(scan)}
                    </span>
                  </p>

                  <p className="text-sm text-slate-400 mt-1">
                    {scan.createdAt
                      ? new Date(
                          scan.createdAt
                        ).toLocaleString()
                      : "Timestamp unavailable"}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Findings:{" "}
                    {scan.findings?.length || 0}
                  </p>

                </div>

              </div>

            ))

          )}

        </div>
      </div>

      {/* VULNERABILITY MODAL */}
      <VulnerabilityModal
        finding={selectedFinding}
        onClose={() =>
          setSelectedFinding(null)
        }
      />

    </div>
  );
}