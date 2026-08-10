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
  const [selectedFinding, setSelectedFinding] =
  useState(null);

  const [stats, setStats] = useState({
    totalScans: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  const fetchRepos = async () => {
    const res = await API.get("/repos");
    setRepos(res.data);
  };

  const fetchScans = async () => {
  const res = await API.get("/scans");

  setScans(res.data);

  let high = 0;
  let medium = 0;
  let low = 0;

  res.data.forEach((scan) => {
    scan.findings?.forEach((finding) => {
      if (finding.severity === "HIGH") high++;
      if (finding.severity === "MEDIUM") medium++;
      if (finding.severity === "LOW") low++;
    });
  });

  setStats({
    totalScans: res.data.length,
    high,
    medium,
    low,
  });

  const riskPoints =
    high * 10 +
    medium * 5 +
    low * 1;

  const score = Math.max(100 - riskPoints, 0);

  setSecurityScore(score);
};

   

  const runScan = async (repoId) => {
    try {
      await API.post("/scans/run", { repoId });
      await fetchScans();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchRepos(), fetchScans()]);
    };

    loadData();
  }, []);

  const riskLevel =
  securityScore >= 80
    ? "Low Risk"
    : securityScore >= 50
    ? "Medium Risk"
    : "High Risk";

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">
        Security Scans
      </h1>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <p className="text-slate-400 text-sm">Total Scans</p>
          <h2 className="text-3xl font-bold mt-2">
            {stats.totalScans}
          </h2>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-red-800">
          <p className="text-red-400 text-sm">High Severity</p>
          <h2 className="text-3xl font-bold mt-2">
            {stats.high}
          </h2>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-yellow-700">
          <p className="text-yellow-400 text-sm">Medium Severity</p>
          <h2 className="text-3xl font-bold mt-2">
            {stats.medium}
          </h2>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-green-700">
          <p className="text-green-400 text-sm">Low Severity</p>
          <h2 className="text-3xl font-bold mt-2">
            {stats.low}
          </h2>
        </div>
      </div>
      {/* Security Score Card */}
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
<SecurityChart
  high={stats.high}
  medium={stats.medium}
  low={stats.low}
/>

      {/* Repo List */}
      <div className="mb-10">
        <h2 className="text-xl mb-4">Repositories</h2>

        <div className="grid gap-4">
          {repos.map((repo) => (
            <div
              key={repo._id}
              className="bg-slate-900 p-4 rounded-lg flex justify-between items-center"
            >
              <span>{repo.repoName}</span>

              <button
                onClick={() => runScan(repo._id)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
              >
                Run Scan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Severity Filter */}
      <div className="flex gap-3 mb-6">
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

      {/* Scan Results */}
      <div>
        <h2 className="text-xl mb-4">Scan Results</h2>

        <div className="grid gap-4">
          {scans.map((scan) => {
            const filteredFindings =
              filter === "ALL"
                ? scan.findings
                : scan.findings?.filter(
                    (f) => f.severity === filter
                  );

            if (!filteredFindings?.length) return null;

            return (
              <div
                key={scan._id}
                className="bg-slate-900 p-4 rounded-lg"
              >
                <p className="text-lg font-bold mb-3">
                  📦 {scan.repoName}
                </p>

                {filteredFindings.map((f, index) => (
                    <div
    key={index}
    onClick={() => setSelectedFinding(f)}
    className="border border-slate-700 rounded p-3 mb-3 cursor-pointer hover:border-blue-500 transition"
  >
                      <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {f.title}
                      </p>

                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          f.severity === "HIGH"
                            ? "bg-red-500/20 text-red-400"
                            : f.severity === "MEDIUM"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {f.severity}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mt-1">
                      {f.cve}
                    </p>

                    <p className="text-slate-400 text-sm mt-1">
                      CVSS Score: {f.score}
                    </p>

                    <p className="text-slate-300 text-sm mt-2">
                      💡 {f.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-10">
  <h2 className="text-2xl font-bold mb-4">
    Vulnerability Table
  </h2>

  <div className="overflow-x-auto">
    <table className="w-full bg-slate-900 rounded-xl overflow-hidden">
      <thead className="bg-slate-800">
        <tr>
          <th className="text-left p-4">Severity</th>
          <th className="text-left p-4">CVE</th>
          <th className="text-left p-4">Title</th>
          <th className="text-left p-4">Score</th>
          <th className="text-left p-4">Repository</th>
        </tr>
      </thead>

      <tbody>
        {scans.flatMap((scan) =>
          scan.findings.map((finding, index) => (
            <tr
              key={`${scan._id}-${index}`}
              className="border-t border-slate-800"
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

              <td className="p-4">
                {finding.cve}
              </td>

              <td className="p-4">
                {finding.title}
              </td>

              <td className="p-4">
                {finding.score}
              </td>

              <td className="p-4">
                {scan.repoName}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
<AISecurityAdvisor scans={scans} />
{/* Scan History Timeline */}
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
      scans
        .slice()
        .reverse()
        .map((scan) => (
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
                  {scan.repoName}
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
<VulnerabilityModal
  finding={selectedFinding}
  onClose={() => setSelectedFinding(null)}
/>
    </div>
  );
}