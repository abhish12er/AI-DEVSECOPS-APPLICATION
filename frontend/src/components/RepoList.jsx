import { useEffect, useState } from "react";
import API from "../api";
import { toast } from "react-toastify";
import RepoModal from "./RepoModal";

export default function RepoList({ refresh }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);

  const fetchRepos = async () => {
    try {
      const res = await API.get("/repos");
      setRepos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRepo = async (id) => {
    try {
      await API.delete(`/repos/${id}`);

      toast.success("Repository deleted successfully!");

      fetchRepos();
    } catch (error) {
      toast.error("Failed to delete repository");
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [refresh]);

  const filteredRepos = repos.filter((repo) =>
    repo.repoName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <h2 className="text-white text-xl">
        Loading repositories...
      </h2>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">
        Repositories
      </h2>

      <input
        type="text"
        placeholder="Search repositories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-6 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {filteredRepos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          No repositories found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepos.map((repo) => (
            <div
              key={repo._id}
              onClick={() => setSelectedRepo(repo)}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500 transition cursor-pointer"
            >
              <h3 className="text-xl font-bold mb-3">
                📦 {repo.repoName}
              </h3>

              <p className="text-slate-400 mb-2">
                👤 {repo.owner}
              </p>

              <p className="mb-2">
                ⭐ {repo.stars || 0}
              </p>

              <p className="text-sm text-slate-500 mb-2">
                🌿 {repo.defaultBranch || "N/A"}
              </p>

              <p className="text-slate-300">
                {repo.description || "No description available"}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRepo(repo._id);
                }}
                className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white transition"
              >
                Delete Repository
              </button>
            </div>
          ))}
        </div>
      )}

      <RepoModal
        repo={selectedRepo}
        onClose={() => setSelectedRepo(null)}
      />
    </div>
  );
}