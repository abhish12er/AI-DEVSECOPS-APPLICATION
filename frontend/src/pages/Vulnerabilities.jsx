import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Vulnerabilities = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  
const [scannerFilter, setScannerFilter] = useState("ALL");


  const [selectedFinding, setSelectedFinding] =
    useState(null);

  const [error, setError] = useState("");

  // =====================================================
  // FETCH SCANS
  // =====================================================

  const fetchScans = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API}/scans`
      );

      /*
       * Backend returns:
       *
       * {
       *   message: "...",
       *   data: [...]
       * }
       *
       * Therefore extract response.data.data.
       */

      const scanData = Array.isArray(
        response.data
      )
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setScans(scanData);
    } catch (error) {
      console.error(
        "Failed to fetch vulnerabilities:",
        error
      );

      setScans([]);

      setError(
        error.response?.data?.message ||
          "Failed to load vulnerability data."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchScans();
  }, []);

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

      if (!repoId) {
        return;
      }

      // Older records without a scanner field
      // belong to the npm audit scanner.
      const scanner = scan.scanner || "npm-audit";

      // Keep one latest scan for each
      // repository AND scanner combination.
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
  // FINDINGS FROM LATEST SCANS
  // =====================================================

  const allFindings = useMemo(() => {
    if (!Array.isArray(latestScans)) {
      return [];
    }

    return latestScans.flatMap(
      (scan) => {
        if (
          !Array.isArray(scan.findings)
        ) {
          return [];
        }

        return scan.findings.map(
          (finding) => ({
            ...finding,
            
scanner: scan.scanner || "npm-audit",


            repoName:
              scan.repoName ||
              scan.repoId?.repoName ||
              "Unknown Repository",

            scanDate:
              scan.createdAt,

            scanId:
              scan._id,
          })
        );
      }
    );
  }, [latestScans]);

  // =====================================================
  // FILTER FINDINGS
  // =====================================================

 
const filteredFindings = useMemo(() => {
  const query = search.trim().toLowerCase();

  return allFindings.filter((finding) => {
    const matchesSearch =
      !query ||
      String(finding.packageName || "")
        .toLowerCase()
        .includes(query) ||
      String(finding.title || "")
        .toLowerCase()
        .includes(query) ||
      String(finding.cve || "")
        .toLowerCase()
        .includes(query) ||
      String(finding.repoName || "")
        .toLowerCase()
        .includes(query);

    const matchesSeverity =
      severityFilter === "ALL" ||
      finding.severity === severityFilter;

    const matchesScanner =
      scannerFilter === "ALL" ||
      finding.scanner === scannerFilter;

    return (
      matchesSearch &&
      matchesSeverity &&
      matchesScanner
    );
  });
}, [
  allFindings,
  search,
  severityFilter,
  scannerFilter,
]);


const filteredScanCount = useMemo(() => {
  return latestScans.filter((scan) => {
    return (
      scannerFilter === "ALL" ||
      (scan.scanner || "npm-audit") === scannerFilter
    );
  }).length;
}, [latestScans, scannerFilter]);



  // =====================================================
  // STATISTICS
  // =====================================================

 
const stats = useMemo(() => {
  const scannerFindings =
    scannerFilter === "ALL"
      ? allFindings
      : allFindings.filter(
          (finding) => finding.scanner === scannerFilter
        );

  return {
    total: scannerFindings.length,
    critical: scannerFindings.filter(
      (finding) => finding.severity === "CRITICAL"
    ).length,
    high: scannerFindings.filter(
      (finding) => finding.severity === "HIGH"
    ).length,
    medium: scannerFindings.filter(
      (finding) => finding.severity === "MEDIUM"
    ).length,
    low: scannerFindings.filter(
      (finding) => finding.severity === "LOW"
    ).length,
    unknown: scannerFindings.filter(
      (finding) => finding.severity === "UNKNOWN"
    ).length,
  };
}, [allFindings, scannerFilter]);

  // =====================================================
  // SEVERITY STYLING
  // =====================================================

  const getSeverityClass = (
    severity
  ) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/10 text-red-400 border-red-500/30";

      case "HIGH":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";

      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";

      case "LOW":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";

      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-400">
            Loading vulnerabilities...
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
          Vulnerabilities
        </h1>

        <p className="text-slate-400 mt-2">
          
Security vulnerabilities detected by npm audit and Trivy
across your connected repositories.

        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

        {/* TOTAL */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">
            Total Findings
          </p>

          <p className="text-3xl font-bold mt-2">
            {stats.total}
          </p>
        </div>

        {/* CRITICAL */}

        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">
          <p className="text-sm text-red-400">
            Critical
          </p>

          <p className="text-3xl font-bold mt-2 text-red-400">
            {stats.critical}
          </p>
        </div>

        {/* HIGH */}

        <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-5">
          <p className="text-sm text-orange-400">
            High
          </p>

          <p className="text-3xl font-bold mt-2 text-orange-400">
            {stats.high}
          </p>
        </div>

        {/* MEDIUM */}

        <div className="bg-slate-900 border border-yellow-500/20 rounded-xl p-5">
          <p className="text-sm text-yellow-400">
            Medium
          </p>

          <p className="text-3xl font-bold mt-2 text-yellow-400">
            {stats.medium}
          </p>
        </div>

        {/* LOW */}

        <div className="bg-slate-900 border border-blue-500/20 rounded-xl p-5">
          <p className="text-sm text-blue-400">
            Low
          </p>

          <p className="text-3xl font-bold mt-2 text-blue-400">
            {stats.low}
          </p>
        </div>

      </div>

      {/* SEARCH + FILTER */}

      
<div className="flex flex-wrap gap-3 mb-6">
  {[
    { label: "All Scanners", value: "ALL" },
    { label: "npm audit", value: "npm-audit" },
    { label: "Trivy", value: "trivy" },
  ].map((scanner) => (
    <button
      key={scanner.value}
      onClick={() => setScannerFilter(scanner.value)}
      className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition ${
        scannerFilter === scanner.value
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {scanner.label}
    </button>
  ))}
</div>


      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">

        <div className="flex flex-col lg:flex-row gap-4">

          <input
            type="text"
            placeholder="Search package, CVE, vulnerability or repository..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />

          <div className="flex flex-wrap gap-2">

            {[
              "ALL",
              "CRITICAL",
              "HIGH",
              "MEDIUM",
              "LOW",
            ].map((severity) => (
              <button
                key={severity}
                onClick={() =>
                  setSeverityFilter(
                    severity
                  )
                }
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                  severityFilter ===
                  severity
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {severity}
              </button>
            ))}

          </div>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Showing{" "}
          <span className="text-white font-medium">
            {filteredFindings.length}
          </span>{" "}
          vulnerabilities from{" "}
          <span className="text-white font-medium">
            {filteredScanCount}
          </span>{" "}
          latest repository scan
          {latestScans.length !== 1
            ? "s"
            : ""}
        </div>
      </div>

      {/* VULNERABILITY TABLE */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        {filteredFindings.length ===
        0 ? (
          <div className="p-12 text-center">

            <div className="text-4xl mb-4">
              🛡️
            </div>

            <h2 className="text-xl font-semibold">
              No vulnerabilities found
            </h2>

            <p className="text-slate-400 mt-2">
              No findings match your current
              search or filter.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                  <th className="px-5 py-4">
                    Severity
                  </th>

                  <th className="px-5 py-4">
                    Package / Vulnerability
                  </th>

                  <th className="px-5 py-4">
                    CVE / Advisory
                  </th>

                  <th className="px-5 py-4">
                    CVSS
                  </th>

                  <th className="px-5 py-4">
                    Repository
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredFindings.map(
                  (finding, index) => (
                    <tr
                      key={
                        finding._id ||
                        `${finding.packageName}-${finding.cve}-${finding.advisory}-${index}`
                      }
                      onClick={() =>
                        setSelectedFinding(
                          finding
                        )
                      }
                      className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition"
                    >

                      {/* SEVERITY */}

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${getSeverityClass(
                            finding.severity
                          )}`}
                        >
                          {finding.severity ||
                            "UNKNOWN"}
                        </span>

                      </td>

                      {/* PACKAGE */}

                      <td className="px-5 py-4">

                        <div className="font-medium text-white">
                          {finding.packageName ||
                            "Unknown package"}
                        </div>

                        <div className="text-sm text-slate-500 mt-1">
                          {finding.title ||
                            "Security vulnerability"}
                        </div>

                      </td>

                      {/* CVE */}

                      <td className="px-5 py-4">

                        {finding.cve &&
                        finding.cve !==
                          "N/A" ? (
                          <span className="text-blue-400">
                            {finding.cve}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            No CVE
                          </span>
                        )}

                      </td>

                      {/* CVSS */}

                      <td className="px-5 py-4">

                        {typeof finding.score ===
                          "number" &&
                        finding.score > 0 ? (
                          <span className="font-medium">
                            {finding.score.toFixed(
                              1
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            N/A
                          </span>
                        )}

                      </td>

                      {/* REPOSITORY */}

                      <td className="px-5 py-4">

                        <div className="text-white">
                          {finding.repoName ||
                            "Unknown"}
                        </div>

                        <div className="text-xs text-slate-500 mt-1">
                          {finding.project ||
                            "Project"}
                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* MODAL */}

      {selectedFinding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() =>
            setSelectedFinding(null)
          }
        >

          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between p-6 border-b border-slate-800">

              <div>
                <h2 className="text-xl font-bold">
                  Vulnerability Details
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  {selectedFinding.packageName}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedFinding(
                    null
                  )
                }
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="p-6 space-y-6">

              {/* SEVERITY + CVSS */}

              <div className="flex flex-wrap gap-3">

                <span
                  className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${getSeverityClass(
                    selectedFinding.severity
                  )}`}
                >
                  {selectedFinding.severity}
                </span>

                <span className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 text-sm">
                  CVSS:{" "}
                  {typeof selectedFinding.score ===
                    "number" &&
                  selectedFinding.score > 0
                    ? selectedFinding.score.toFixed(
                        1
                      )
                    : "N/A"}
                </span>

              </div>

              {/* TITLE */}

              <div>

                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  Vulnerability
                </p>

                <p className="text-white">
                  {selectedFinding.title ||
                    "Security vulnerability"}
                </p>

              </div>

              {/* CVE */}

              <div>

                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  CVE
                </p>

                <p className="text-white">
                  {selectedFinding.cve &&
                  selectedFinding.cve !==
                    "N/A"
                    ? selectedFinding.cve
                    : "No CVE reported by npm audit"}
                </p>

              </div>

              {/* SOURCE */}

              <div>

                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  Advisory Source
                </p>

                <p className="text-white">
                  {selectedFinding.source &&
                  selectedFinding.source !==
                    "N/A"
                    ? selectedFinding.source
                    : "N/A"}
                </p>

              </div>

              {/* CWE */}

              {Array.isArray(
                selectedFinding.cwe
              ) &&
                selectedFinding.cwe.length >
                  0 && (
                  <div>

                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                      CWE
                    </p>

                    <div className="flex flex-wrap gap-2">

                      {selectedFinding.cwe.map(
                        (cwe) => (
                          <span
                            key={cwe}
                            className="px-2.5 py-1 bg-slate-800 rounded-md text-sm text-slate-300"
                          >
                            {cwe}
                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}

              {/* AFFECTED VERSION */}

              <div>

                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  Affected Version / Range
                </p>

                <code className="text-sm text-slate-300 bg-slate-800 px-3 py-2 rounded-lg inline-block">
                  {selectedFinding.affectedVersion ||
                    "N/A"}
                </code>

              </div>

              {/* REMEDIATION */}

              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">

                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  Remediation
                </p>

                <p className="text-white">
                  {selectedFinding.recommendation ||
                    "No remediation information available."}
                </p>

                <div className="mt-4 space-y-2 text-sm">

                  <div className="flex justify-between gap-4">

                    <span className="text-slate-400">
                      Fix available
                    </span>

                    <span
                      className={
                        selectedFinding.fixAvailable
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {selectedFinding.fixAvailable
                        ? "Yes"
                        : "No"}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4">

                    <span className="text-slate-400">
                      Fix version
                    </span>

                    <span className="text-white">
                      {selectedFinding.fixVersion &&
                      selectedFinding.fixVersion !==
                        "N/A"
                        ? selectedFinding.fixVersion
                        : "N/A"}
                    </span>

                  </div>

                  {selectedFinding.fixIsMajor && (
                    <div className="mt-3 text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      npm reports that this fix
                      may introduce a SemVer-major
                      or breaking change.
                    </div>
                  )}

                </div>

              </div>

              {/* ADVISORY */}

              <div>

                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  Advisory
                </p>

                {selectedFinding.advisory &&
                /^https?:\/\//i.test(
                  selectedFinding.advisory
                ) ? (
                  <a
                    href={
                      selectedFinding.advisory
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 break-all"
                  >
                    {selectedFinding.advisory}
                  </a>
                ) : (
                  <p className="text-slate-500">
                    No advisory URL reported by
                    npm audit.
                  </p>
                )}

              </div>

              {/* REPOSITORY */}

              <div>

                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  Repository
                </p>

                <p className="text-white">
                  {selectedFinding.repoName ||
                    "Unknown Repository"}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Project:{" "}
                  {selectedFinding.project ||
                    "N/A"}
                </p>

              </div>

            </div>

            {/* MODAL FOOTER */}

            <div className="p-6 border-t border-slate-800 flex justify-end">

              <button
                onClick={() =>
                  setSelectedFinding(
                    null
                  )
                }
                className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Vulnerabilities;
