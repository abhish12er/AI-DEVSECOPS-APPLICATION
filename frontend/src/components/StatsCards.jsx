import { useEffect, useState } from "react";
import API from "../api";

export default function StatsCards({ refresh }) {
  const [repoCount, setRepoCount] = useState(0);
  const [totalStars, setTotalStars] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await API.get("/repos");

      const repos = res.data;

      setRepoCount(repos.length);

      const stars = repos.reduce(
        (total, repo) => total + (repo.stars || 0),
        0
      );

      setTotalStars(stars);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refresh]);

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-10">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-slate-400 text-sm uppercase tracking-wide">
          Repositories
        </p>

        <h2 className="text-3xl font-bold mt-2">
          {repoCount}
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-slate-400 text-sm uppercase tracking-wide">
          Total Stars
        </p>

        <h2 className="text-3xl font-bold mt-2">
          {totalStars.toLocaleString()}
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-slate-400 text-sm uppercase tracking-wide">
          Security Scans
        </p>

        <h2 className="text-3xl font-bold mt-2">
          0
        </h2>
      </div>
    </div>
  );
}