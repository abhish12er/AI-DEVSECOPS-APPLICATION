import { useState } from "react";
import API from "../api";
import { toast } from "react-toastify";

export default function RepoForm({ onRepoAdded }) {
  const [repoUrl, setRepoUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/repos/connect", { repoUrl });

      onRepoAdded();

      toast.success("Repository added successfully!");

      setRepoUrl("");
    } catch (err) {
      toast.error(
  err.response?.data?.message || "Something went wrong"
);
    }
  };

 return (
  <form
    onSubmit={handleSubmit}
    className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8"
  >
    <div className="flex gap-4">
      <input
        type="text"
        placeholder="Enter GitHub Repository URL"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
       className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Add Repo
      </button>
    </div>
  </form>
);
}