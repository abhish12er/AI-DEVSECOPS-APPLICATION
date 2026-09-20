import { useEffect, useMemo, useState } from "react";
import API from "../api";

export default function Vulnerabilities() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [fixFilter, setFixFilter] = useState("ALL");
  const [selectedFinding, setSelectedFinding] = useState(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const response = await API.get("/scans");
      setScans(response.data || []);
    } catch (error) {
      console.error(
        "Failed to fetch vulnerabilities:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // GET LATEST SCAN
  // ======================================================

  const latestScan = scans.length > 0 ? scans[0] : null;

  // ======================================================
  // CONVERT FINDINGS
  // ======================================================

  const vulnerabilities = useMemo(() => {
    if (!latestScan) {
      return [];
    }

    return (latestScan.findings || []).map(
      (finding, index) => ({
        ...finding,

        uniqueId:
          finding._id ||
          `${latestScan._id}-${index}`,

        scanId: latestScan._id,

        repositoryName:
          latestScan.repoId?.repoName ||
          latestScan.repository?.repoName ||
          "Unknown Repository",

        owner:
          latestScan.repoId?.owner ||
          "",

        scanDate:
          latestScan.createdAt,
      })
    );
  }, [latestScan]);

  // ======================================================
  // VULNERABLE PACKAGE COUNT
  // ======================================================

  const vulnerablePackages = useMemo(() => {
    const packages = new Set();

    vulnerabilities.forEach(
      (finding) => {
        if (finding.packageName) {
          packages.add(
            `${finding.project || ""}:${finding.packageName}`
          );
        }
      }
    );

    return packages.size;
  }, [vulnerabilities]);

  // ======================================================
  // ADVISORY COUNT
  // ======================================================

  const advisoryCount =
    vulnerabilities.length;

  // ======================================================
  // SEVERITY COUNTS
  // ======================================================

  const criticalCount =
    vulnerabilities.filter(
      (v) =>
        v.severity?.toUpperCase() ===
        "CRITICAL"
    ).length;

  const highCount =
    vulnerabilities.filter(
      (v) =>
        v.severity?.toUpperCase() ===
        "HIGH"
    ).length;

  const mediumCount =
    vulnerabilities.filter(
      (v) =>
        v.severity?.toUpperCase() ===
        "MEDIUM"
    ).length;

  const lowCount =
    vulnerabilities.filter(
      (v) =>
        v.severity?.toUpperCase() ===
        "LOW"
    ).length;

  // ======================================================
  // FIX COUNTS
  // ======================================================

  const fixAvailableCount =
    vulnerabilities.filter(
      (v) =>
        v.fixAvailable === true
    ).length;

  const noFixCount =
    vulnerabilities.filter(
      (v) =>
        v.fixAvailable !== true
    ).length;

  // ======================================================
  // FILTER
  // ======================================================

  const filteredVulnerabilities =
    vulnerabilities.filter(
      (vulnerability) => {

        const severityMatch =
          filter === "ALL" ||
          vulnerability.severity?.toUpperCase() ===
            filter;

        const fixMatch =
          fixFilter === "ALL" ||
          (fixFilter === "FIX" &&
            vulnerability.fixAvailable === true) ||
          (fixFilter === "NO_FIX" &&
            vulnerability.fixAvailable !== true);

        return (
          severityMatch &&
          fixMatch
        );
      }
    );

  // ======================================================
  // SEVERITY STYLE
  // ======================================================

  const getSeverityClass = (
    severity
  ) => {
    switch (
      severity?.toUpperCase()
    ) {
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/30";

      case "HIGH":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";

      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

      case "LOW":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";

      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  // ======================================================
  // DATE FORMAT
  // ======================================================

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "N/A";
    }

    return new Date(
      date
    ).toLocaleString();
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="p-6 md:p-8 text-white">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">
          Vulnerabilities
        </h1>

        <p className="text-slate-400 mt-2">
          Real dependency vulnerabilities
          detected using npm audit.
        </p>

      </div>


      {/* ==================================================
          SECURITY OVERVIEW
      ================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        {/* Vulnerable Packages */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <p className="text-slate-400 text-sm">
            Vulnerable Packages
          </p>

          <p className="text-3xl font-bold mt-2">
            {vulnerablePackages}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Unique packages
          </p>

        </div>


        {/* Security Advisories */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <p className="text-slate-400 text-sm">
            Security Advisories
          </p>

          <p className="text-3xl font-bold mt-2">
            {advisoryCount}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Individual findings
          </p>

        </div>


        {/* Fix Available */}

        <div className="bg-slate-900 border border-green-500/20 rounded-xl p-5">

          <p className="text-green-400 text-sm">
            Fix Available
          </p>

          <p className="text-3xl font-bold mt-2 text-green-400">
            {fixAvailableCount}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Can be upgraded
          </p>

        </div>


        {/* No Fix */}

        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">

          <p className="text-red-400 text-sm">
            No Fix Available
          </p>

          <p className="text-3xl font-bold mt-2 text-red-400">
            {noFixCount}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Requires review
          </p>

        </div>

      </div>


      {/* ==================================================
          SEVERITY SUMMARY
      ================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4">

          <p className="text-red-400 text-sm">
            Critical
          </p>

          <p className="text-2xl font-bold mt-1">
            {criticalCount}
          </p>

        </div>


        <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-4">

          <p className="text-orange-400 text-sm">
            High
          </p>

          <p className="text-2xl font-bold mt-1">
            {highCount}
          </p>

        </div>


        <div className="bg-slate-900 border border-yellow-500/20 rounded-xl p-4">

          <p className="text-yellow-400 text-sm">
            Medium
          </p>

          <p className="text-2xl font-bold mt-1">
            {mediumCount}
          </p>

        </div>


        <div className="bg-slate-900 border border-blue-500/20 rounded-xl p-4">

          <p className="text-blue-400 text-sm">
            Low
          </p>

          <p className="text-2xl font-bold mt-1">
            {lowCount}
          </p>

        </div>

      </div>


      {/* ==================================================
          FILTERS
      ================================================== */}

      <div className="flex flex-wrap gap-3 mb-6">

        {[
          "ALL",
          "CRITICAL",
          "HIGH",
          "MEDIUM",
          "LOW",
        ].map(
          (severity) => (

            <button
              key={severity}
              onClick={() =>
                setFilter(
                  severity
                )
              }
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                filter === severity
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {severity}
            </button>

          )
        )}


        <div className="w-px bg-slate-700 mx-1" />


        <button
          onClick={() =>
            setFixFilter(
              "ALL"
            )
          }
          className={`px-4 py-2 rounded-lg border text-sm font-medium ${
            fixFilter === "ALL"
              ? "bg-slate-700 border-slate-600 text-white"
              : "bg-slate-900 border-slate-700 text-slate-300"
          }`}
        >
          All Fix Status
        </button>


        <button
          onClick={() =>
            setFixFilter(
              "FIX"
            )
          }
          className={`px-4 py-2 rounded-lg border text-sm font-medium ${
            fixFilter === "FIX"
              ? "bg-green-600 border-green-600 text-white"
              : "bg-slate-900 border-slate-700 text-slate-300"
          }`}
        >
          Fix Available
        </button>


        <button
          onClick={() =>
            setFixFilter(
              "NO_FIX"
            )
          }
          className={`px-4 py-2 rounded-lg border text-sm font-medium ${
            fixFilter === "NO_FIX"
              ? "bg-red-600 border-red-600 text-white"
              : "bg-slate-900 border-slate-700 text-slate-300"
          }`}
        >
          No Fix
        </button>

      </div>


      {/* ==================================================
          LOADING
      ================================================== */}

      {loading && (

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">

          <p className="text-slate-400">
            Loading vulnerabilities...
          </p>

        </div>

      )}


      {/* ==================================================
          NO DATA
      ================================================== */}

      {!loading &&
        vulnerabilities.length === 0 && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">

            <div className="text-4xl mb-4">
              🛡️
            </div>

            <h2 className="text-xl font-semibold">
              No vulnerabilities found
            </h2>

            <p className="text-slate-400 mt-2">
              Run a security scan to detect
              dependency vulnerabilities.
            </p>

          </div>

        )}


      {/* ==================================================
          FILTERED EMPTY
      ================================================== */}

      {!loading &&
        vulnerabilities.length > 0 &&
        filteredVulnerabilities.length === 0 && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">

            <h2 className="text-xl font-semibold">
              No matching vulnerabilities
            </h2>

            <p className="text-slate-400 mt-2">
              Try changing your filters.
            </p>

          </div>

        )}


      {/* ==================================================
          VULNERABILITY TABLE
      ================================================== */}

      {!loading &&
        filteredVulnerabilities.length > 0 && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-800">

              <h2 className="text-lg font-semibold">
                Security Findings
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                {filteredVulnerabilities.length} finding
                {filteredVulnerabilities.length !== 1
                  ? "s"
                  : ""}
              </p>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-slate-950">

                  <tr>

                    <th className="px-6 py-4 text-sm text-slate-400">
                      Package
                    </th>

                    <th className="px-6 py-4 text-sm text-slate-400">
                      Project
                    </th>

                    <th className="px-6 py-4 text-sm text-slate-400">
                      Severity
                    </th>

                    <th className="px-6 py-4 text-sm text-slate-400">
                      CVSS
                    </th>

                    <th className="px-6 py-4 text-sm text-slate-400">
                      Fix
                    </th>

                    <th className="px-6 py-4 text-sm text-slate-400">
                      Advisory
                    </th>

                    <th className="px-6 py-4 text-sm text-slate-400">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredVulnerabilities.map(
                    (vulnerability) => (

                      <tr
                        key={
                          vulnerability.uniqueId
                        }
                        className="border-t border-slate-800 hover:bg-slate-800/40"
                      >

                        {/* PACKAGE */}

                        <td className="px-6 py-4 min-w-[200px]">

                          <p className="font-semibold text-white">
                            {vulnerability.packageName ||
                              "Unknown package"}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            {vulnerability.title ||
                              "Security vulnerability"}
                          </p>

                        </td>


                        {/* PROJECT */}

                        <td className="px-6 py-4">

                          <p className="text-slate-200">
                            {vulnerability.project ||
                              "Unknown"}
                          </p>

                        </td>


                        {/* SEVERITY */}

                        <td className="px-6 py-4">

                          <span
                            className={`inline-flex px-3 py-1 rounded-full border text-xs font-semibold ${getSeverityClass(
                              vulnerability.severity
                            )}`}
                          >
                            {vulnerability.severity ||
                              "UNKNOWN"}
                          </span>

                        </td>


                        {/* CVSS */}

                        <td className="px-6 py-4">

                          <span className="font-semibold">
                            {vulnerability.score ??
                              "N/A"}
                          </span>

                        </td>


                        {/* FIX */}

                        <td className="px-6 py-4">

                          {vulnerability.fixAvailable ? (

                            <div>

                              <span className="inline-flex px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-semibold">
                                Available
                              </span>

                              {vulnerability.fixVersion &&
                                vulnerability.fixVersion !==
                                  "N/A" && (

                                  <p className="text-xs text-slate-400 mt-1">
                                    →{" "}
                                    {
                                      vulnerability.fixVersion
                                    }
                                  </p>

                                )}

                            </div>

                          ) : (

                            <span className="inline-flex px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold">
                              No Fix
                            </span>

                          )}

                        </td>


                        {/* ADVISORY */}

                        <td className="px-6 py-4">

                          {vulnerability.advisory &&
                          vulnerability.advisory !==
                            "N/A" &&
                          vulnerability.advisory.startsWith(
                            "http"
                          ) ? (

                            <a
                              href={
                                vulnerability.advisory
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              View
                            </a>

                          ) : (

                            <span className="text-slate-500 text-sm">
                              N/A
                            </span>

                          )}

                        </td>


                        {/* ACTION */}

                        <td className="px-6 py-4">

                          <button
                            onClick={() =>
                              setSelectedFinding(
                                vulnerability
                              )
                            }
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-blue-400"
                          >
                            Details
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}


      {/* ==================================================
          DETAILS MODAL
      ================================================== */}

      {selectedFinding && (

        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() =>
            setSelectedFinding(
              null
            )
          }
        >

          <div
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between p-6 border-b border-slate-800">

              <div>

                <h2 className="text-xl font-bold">
                  Vulnerability Details
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  {selectedFinding.packageName ||
                    "Unknown package"}
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


            {/* MODAL CONTENT */}

            <div className="p-6 space-y-6">

              {/* TITLE */}

              <div>

                <p className="text-sm text-slate-400 mb-2">
                  Vulnerability
                </p>

                <p className="text-white font-medium">
                  {selectedFinding.title ||
                    "Security vulnerability"}
                </p>

              </div>


              {/* PACKAGE / PROJECT */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="bg-slate-950 rounded-lg p-4">

                  <p className="text-sm text-slate-400">
                    Package
                  </p>

                  <p className="font-semibold mt-2">
                    {selectedFinding.packageName ||
                      "N/A"}
                  </p>

                </div>


                <div className="bg-slate-950 rounded-lg p-4">

                  <p className="text-sm text-slate-400">
                    Project
                  </p>

                  <p className="font-semibold mt-2">
                    {selectedFinding.project ||
                      "N/A"}
                  </p>

                </div>

              </div>


              {/* SEVERITY / SCORE */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="bg-slate-950 rounded-lg p-4">

                  <p className="text-sm text-slate-400">
                    Severity
                  </p>

                  <span
                    className={`inline-flex mt-2 px-3 py-1 rounded-full border text-xs font-semibold ${getSeverityClass(
                      selectedFinding.severity
                    )}`}
                  >
                    {selectedFinding.severity ||
                      "UNKNOWN"}
                  </span>

                </div>


                <div className="bg-slate-950 rounded-lg p-4">

                  <p className="text-sm text-slate-400">
                    CVSS Score
                  </p>

                  <p className="text-xl font-bold mt-2">
                    {selectedFinding.score ??
                      "N/A"}
                  </p>

                </div>

              </div>


              {/* AFFECTED VERSION */}

              <div>

                <p className="text-sm text-slate-400 mb-2">
                  Affected Version
                </p>

                <div className="bg-slate-950 rounded-lg p-4">

                  <p className="text-slate-200">
                    {selectedFinding.affectedVersion ||
                      "N/A"}
                  </p>

                </div>

              </div>


              {/* FIX */}

              <div>

                <p className="text-sm text-slate-400 mb-2">
                  Fix Status
                </p>

                <div className="bg-slate-950 rounded-lg p-4">

                  {selectedFinding.fixAvailable ? (

                    <div>

                      <p className="text-green-400 font-semibold">
                        Fix Available
                      </p>

                      {selectedFinding.fixVersion &&
                        selectedFinding.fixVersion !==
                          "N/A" && (

                          <p className="text-slate-300 mt-1">
                            Recommended version:{" "}
                            <span className="font-semibold">
                              {
                                selectedFinding.fixVersion
                              }
                            </span>
                          </p>

                        )}

                    </div>

                  ) : (

                    <p className="text-red-400 font-semibold">
                      No automatic fix available
                    </p>

                  )}

                </div>

              </div>


              {/* CVE */}

              <div>

                <p className="text-sm text-slate-400 mb-2">
                  CVE
                </p>

                <p className="text-slate-200 break-all">
                  {selectedFinding.cve &&
                  selectedFinding.cve !==
                    "N/A"
                    ? selectedFinding.cve
                    : "N/A"}
                </p>

              </div>


              {/* ADVISORY */}

              <div>

                <p className="text-sm text-slate-400 mb-2">
                  Security Advisory
                </p>

                {selectedFinding.advisory &&
                selectedFinding.advisory !==
                  "N/A" ? (

                  <a
                    href={
                      selectedFinding.advisory
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all"
                  >
                    {
                      selectedFinding.advisory
                    }
                  </a>

                ) : (

                  <p className="text-slate-500">
                    N/A
                  </p>

                )}

              </div>


              {/* RECOMMENDATION */}

              <div>

                <p className="text-sm text-slate-400 mb-2">
                  Recommendation
                </p>

                <div className="bg-slate-950 rounded-lg p-4">

                  <p className="text-slate-200">
                    {selectedFinding.recommendation ||
                      "Update the affected dependency to a secure version."}
                  </p>

                </div>

              </div>


              {/* DETECTED */}

              <div>

                <p className="text-sm text-slate-400 mb-2">
                  Detected
                </p>

                <p className="text-slate-300">
                  {formatDate(
                    selectedFinding.scanDate
                  )}
                </p>

              </div>

            </div>


            {/* MODAL FOOTER */}

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end">

              <button
                onClick={() =>
                  setSelectedFinding(
                    null
                  )
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
