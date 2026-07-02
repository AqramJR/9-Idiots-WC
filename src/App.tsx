import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LandingPage } from '@/pages/LandingPage';
import { AdminPage } from '@/pages/AdminPage';
import { JoinForm } from '@/components/join/JoinForm';
import { MatchesPage } from '@/components/matches/MatchesPage';
import { LeaderboardPage } from '@/components/leaderboard/LeaderboardPage';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { StatsPage } from '@/components/stats/StatsPage';
import { RequireIdentity } from '@/router/RequireIdentity';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/join" element={<JoinForm />} />

      <Route
        path="/matches"
        element={
          <RequireIdentity>
            <Layout>
              <MatchesPage />
            </Layout>
          </RequireIdentity>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireIdentity>
            <Layout>
              <LeaderboardPage />
            </Layout>
          </RequireIdentity>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireIdentity>
            <Layout>
              <ProfilePage />
            </Layout>
          </RequireIdentity>
        }
      />
      <Route
        path="/stats"
        element={
          <RequireIdentity>
            <Layout>
              <StatsPage />
            </Layout>
          </RequireIdentity>
        }
      />

      <Route
        path="/admin"
        element={
          <Layout>
            <AdminPage />
          </Layout>
        }
      />

      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
