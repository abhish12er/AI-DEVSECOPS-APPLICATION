import { useState } from "react";
import RepoForm from "../components/RepoForm";
import RepoList from "../components/RepoList";
import StatsCards from "../components/StatsCards";
import RepositoryInsights from "../components/RepositoryInsights";

export default function Home() {
  const [refresh, setRefresh] = useState(false);

  const refreshRepos = () => {
    setRefresh(!refresh);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold tracking-tight">
            AI DevSecOps Platform
          </h1>

          <p className="text-slate-400 text-lg mt-3">
            Monitor • Scan • Secure • Deploy
          </p>
        </div>

        

        {/* Dashboard Stats */}
        <StatsCards refresh={refresh} />

        {/* Repository Insights */}
        <RepositoryInsights refresh={refresh} />

        {/* Add Repository Form */}
        <RepoForm onRepoAdded={refreshRepos} />

        {/* Repository List */}
        <RepoList refresh={refresh} />
      </div>
    </div>
  );
}