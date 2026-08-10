import { useState } from "react";

export default function AISecurityAdvisor({ scans }) {
  const [analysis, setAnalysis] = useState("");

  const generateAnalysis = () => {
    let high = 0;
    let medium = 0;
    let low = 0;

    scans.forEach((scan) => {
      scan.findings?.forEach((finding) => {
        if (finding.severity === "HIGH") high++;
        if (finding.severity === "MEDIUM") medium++;
        if (finding.severity === "LOW") low++;
      });
    });

    let riskLevel = "Low";

    if (high > 2) {
      riskLevel = "High";
    } else if (medium > 2) {
      riskLevel = "Medium";
    }

    const summary = `
Risk Level: ${riskLevel}

High Vulnerabilities: ${high}
Medium Vulnerabilities: ${medium}
Low Vulnerabilities: ${low}

Recommendations:

• Update vulnerable dependencies
• Remove hardcoded secrets
• Enable dependency scanning
• Review CI/CD security policies
• Apply security headers and best practices
`;

    setAnalysis(summary);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          AI Security Advisor
        </h2>

        <button
          onClick={generateAnalysis}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
        >
          Analyze Security
        </button>
      </div>

      {analysis && (
        <pre className="whitespace-pre-wrap text-slate-300">
          {analysis}
        </pre>
      )}
    </div>
  );
}