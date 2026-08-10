export default function RepoModal({ repo, onClose }) {
  if (!repo) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 text-white p-6 rounded-xl w-full max-w-2xl border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            Repository Details
          </h2>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <p>
            <strong>Name:</strong> {repo.repoName}
          </p>

          <p>
            <strong>Owner:</strong> {repo.owner}
          </p>

          <p>
            <strong>Stars:</strong> {repo.stars}
          </p>

          <p>
            <strong>Default Branch:</strong>{" "}
            {repo.defaultBranch}
          </p>

          <p>
            <strong>Repository URL:</strong>
          </p>

          <a
            href={repo.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 break-all"
          >
            {repo.repoUrl}
          </a>

          <div>
            <strong>Description:</strong>

            <p className="mt-2 text-slate-300">
              {repo.description}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 bg-blue-600 px-4 py-2 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}