import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Divider, Tabs, Typography } from 'tdesign-react';
import { BookOpenIcon, CalendarIcon, UserIcon } from 'tdesign-icons-react';

import { APP_NAME } from './constants';
import { toISODate } from './lib/date';
import { apiJson, getToken, setToken, toastError } from './lib/api';
import type { PlanItem, ResourceItem, User } from './types';
import { AuthDrawer } from './components/AuthDrawer';
import { AdminTab } from './tabs/AdminTab.tsx';
import { PlansTab } from './tabs/PlansTab.tsx';
import { ResourcesTab } from './tabs/ResourcesTab.tsx';

type TabKey = 'plans' | 'resources' | 'admin';

function App() {
  const [tab, setTab] = useState<TabKey>('plans');
  const [authOpen, setAuthOpen] = useState(false);

  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const [todayPlans, setTodayPlans] = useState<PlanItem[]>([]);

  const todayStats = useMemo(() => {
    const done = todayPlans.filter((p) => p.done).length;
    return { done, total: todayPlans.length };
  }, [todayPlans]);

  // refresh user session
  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setTodayPlans([]);
      return;
    }

    apiJson<{ user: User }>('/api/auth/me', { auth: true })
      .then((r) => setCurrentUser(r.user))
      .catch((e) => {
        toastError(e, '登录状态已失效');
        setToken(null);
        setTokenState(null);
        setCurrentUser(null);
      });
  }, [token]);

  // refresh today stats
  useEffect(() => {
    if (!token) return;
    apiJson<{ plans: PlanItem[] }>(`/api/plans?date=${todayISO}`, { auth: true })
      .then((r) => setTodayPlans(r.plans))
      .catch((e) => toastError(e, '获取今日计划失败'));
  }, [token, todayISO]);

  function onAuthed(user: User) {
    setTokenState(getToken());
    setCurrentUser(user);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setCurrentUser(null);
    setTodayPlans([]);
  }

  return (
    <div className="min-h-full bg-white">
      <header className="fixed left-0 right-0 top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-ink-900 shadow-sm">
              <CalendarIcon />
            </div>
            <div>
              <Typography.Title level="h4" className="!mb-0 !text-ink-900">
                {APP_NAME}
              </Typography.Title>
              <Typography.Text className="text-slate-600">
                {currentUser ? `今天完成：${todayStats.done}/${todayStats.total}` : '请登录后开始云端同步'}
              </Typography.Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              theme={tab === 'plans' ? 'primary' : 'default'}
              variant={tab === 'plans' ? 'base' : 'outline'}
              icon={<CalendarIcon />}
              onClick={() => setTab('plans')}
            >
              计划打卡
            </Button>
            <Button
              theme={tab === 'resources' ? 'primary' : 'default'}
              variant={tab === 'resources' ? 'base' : 'outline'}
              icon={<BookOpenIcon />}
              onClick={() => setTab('resources')}
            >
              学习资料
            </Button>
            <Button
              theme={tab === 'admin' ? 'primary' : 'default'}
              variant={tab === 'admin' ? 'base' : 'outline'}
              icon={<UserIcon />}
              onClick={() => setTab('admin')}
            >
              管理员
            </Button>

            <div className="ml-2 hidden h-8 w-px bg-slate-200 sm:block" />

            <Badge count={isAdmin ? '管理员' : 0} showZero={false}>
              <Button variant="outline" icon={<UserIcon />} onClick={() => setAuthOpen(true)}>
                {currentUser ? currentUser.username : '登录/注册'}
              </Button>
            </Badge>

            {currentUser ? (
              <Button theme="danger" variant="outline" onClick={logout}>
                退出
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-20 pb-10">
        <div className="rounded-2xl bg-slate-50 p-3 shadow-soft">
          <Tabs value={tab} onChange={(v) => setTab(v as TabKey)} theme="card">
            <Tabs.TabPanel value="plans" label="计划打卡">
              <PlansTab token={token} openAuth={() => setAuthOpen(true)} onTodayChanged={(p) => setTodayPlans(p)} />
            </Tabs.TabPanel>
            <Tabs.TabPanel value="resources" label="学习资料">
              <ResourcesTab token={token} openAuth={() => setAuthOpen(true)} isAdmin={isAdmin} />
            </Tabs.TabPanel>
            <Tabs.TabPanel value="admin" label="管理员">
              <AdminTab currentUser={currentUser} openAuth={() => setAuthOpen(true)} />
            </Tabs.TabPanel>
          </Tabs>
        </div>

        <Divider className="!my-8" />
        <Typography.Text className="text-slate-600">
          云端模式：账号与计划数据保存在服务器数据库中，多端访问会同步。你也可以把计划标记为“公开”，让其他用户在“全站公开动态”里看到。
        </Typography.Text>
      </main>

      <AuthDrawer visible={authOpen} setVisible={setAuthOpen} onAuthed={onAuthed} />
    </div>
  );
}

export default App;
