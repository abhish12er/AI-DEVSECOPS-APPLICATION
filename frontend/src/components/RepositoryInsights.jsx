import { useEffect, useState } from "react";
import API from "../api";

export default function RepositoryInsights({ refresh }) {
  const [stats, setStats] = useState({
    mostStarred: null,
    averageStars: 0,
    totalRepos: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/repos");

        const repos = res.data;

        if (repos.length === 0) {
          return;
        }

        const mostStarred = repos.reduce((prev, current) =>
          current.stars > prev.stars ? current : prev
        );

        const totalStars = repos.reduce(
          (sum, repo) => sum + (repo.stars || 0),
          0
        );

        setStats({
          mostStarred,
          averageStars: Math.round(totalStars / repos.length),
          totalRepos: repos.length,
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [refresh]);

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-10">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-400 text-sm mb-2">
          Most Starred Repository
        </h3>

        <p className="text-xl font-bold">
          {stats.mostStarred?.repoName || "--"}
        </p>

        <p className="text-slate-500">
          ⭐ {stats.mostStarred?.stars?.toLocaleString() || 0}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-400 text-sm mb-2">
          Average Stars
        </h3>

        <p className="text-2xl font-bold">
          {stats.averageStars.toLocaleString()}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-400 text-sm mb-2">
          Total Repositories
        </h3>

        <p className="text-2xl font-bold">
          {stats.totalRepos}
        </p>
      </div>
    </div>
  );
}