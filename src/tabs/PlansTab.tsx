import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  InputNumber,
  Select,
  Switch,
  Textarea,
  Typography,
} from 'tdesign-react';
import { AddIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from 'tdesign-icons-react';

import { DEFAULT_CATEGORIES } from '../constants';
import { addMonths, formatMonthTitle, getMonthGrid, pad2, toISODate } from '../lib/date';
import { apiJson, toastError } from '../lib/api';
import type { PlanItem, PublicPlanItem, TechCategory } from '../types';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

type MonthPlansResponse = { plans: PlanItem[] };

type PublicPlansResponse = { plans: PublicPlanItem[] };

export function PlansTab(props: {
  token: string | null;
  openAuth: () => void;
  onTodayChanged: (plans: PlanItem[]) => void;
}) {
  const { token, openAuth, onTodayChanged } = props;

  const [month, setMonth] = useState<Date>(() => new Date());
  const [selectedISO, setSelectedISO] = useState<string>(() => toISODate(new Date()));

  const [monthPlans, setMonthPlans] = useState<PlanItem[]>([]);
  const [publicPlans, setPublicPlans] = useState<PublicPlanItem[]>([]);

  const [autoSync, setAutoSync] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const [draftCategory, setDraftCategory] = useState<TechCategory>(DEFAULT_CATEGORIES[0]);
  const [draftMinutes, setDraftMinutes] = useState(60);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftPublic, setDraftPublic] = useState(true);

  const todayISO = useMemo(() => toISODate(new Date()), []);

  const monthKey = useMemo(() => {
    return `${month.getFullYear()}-${pad2(month.getMonth() + 1)}`;
  }, [month]);

  const monthGrid = useMemo(() => getMonthGrid(month, true), [month]);

  const dayStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const p of monthPlans) {
      const prev = map.get(p.date) ?? { total: 0, done: 0 };
      map.set(p.date, { total: prev.total + 1, done: prev.done + (p.done ? 1 : 0) });
    }
    return map;
  }, [monthPlans]);

  const selectedPlans = useMemo(() => {
    return monthPlans
      .filter((p) => p.date === selectedISO)
      .sort((a, b) => (a.done === b.done ? (b.updated_at ?? '').localeCompare(a.updated_at ?? '') : a.done ? 1 : -1));
  }, [monthPlans, selectedISO]);

  const selectedProgress = useMemo(() => {
    const done = selectedPlans.filter((p) => p.done).length;
    return { done, total: selectedPlans.length };
  }, [selectedPlans]);

  function loadMonthPlans() {
    if (!token) {
      setMonthPlans([]);
      return;
    }
    apiJson<MonthPlansResponse>(`/api/plans/month?month=${monthKey}`, { auth: true })
      .then((r) => {
        setMonthPlans(r.plans);
      })
      .catch((e) => toastError(e, '加载本月计划失败'));
  }

  function loadPublicPlans() {
    if (!token) {
      setPublicPlans([]);
      return;
    }

    apiJson<PublicPlansResponse>(`/api/plans/public?date=${selectedISO}`, { auth: true })
      .then((r) => setPublicPlans(r.plans))
      .catch((e) => toastError(e, '加载公开动态失败'));
  }

  useEffect(() => {
    loadMonthPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, monthKey]);

  useEffect(() => {
    loadPublicPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedISO]);

  useEffect(() => {
    const todays = monthPlans.filter((p) => p.date === todayISO);
    onTodayChanged(todays);
  }, [monthPlans, onTodayChanged, todayISO]);

  useEffect(() => {
    if (!token || !autoSync) return;
    const id = window.setInterval(() => {
      loadMonthPlans();
      loadPublicPlans();
    }, 10_000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, autoSync, monthKey, selectedISO]);

  function openAddPlan() {
    setEditingId(null);
    setDraftTitle('');
    setDraftCategory(DEFAULT_CATEGORIES[0]);
    setDraftMinutes(60);
    setDraftNotes('');
    setDraftPublic(true);
    setDrawerOpen(true);
  }

  function openEditPlan(p: PlanItem) {
    setEditingId(p.id);
    setDraftTitle(p.title);
    setDraftCategory(p.category);
    setDraftMinutes(p.minutes);
    setDraftNotes(p.notes ?? '');
    setDraftPublic(p.public);
    setDrawerOpen(true);
  }

  function savePlan() {
    const title = draftTitle.trim();
    if (!title) return;
    if (!token) return;

    const body = {
      date: selectedISO,
      title,
      category: draftCategory,
      minutes: Math.max(5, Number(draftMinutes) || 0),
      notes: draftNotes.trim() ? draftNotes.trim() : null,
      public: draftPublic,
    };

    if (editingId) {
      apiJson<{ plan: PlanItem }>(`/api/plans/${editingId}`, {
        method: 'PATCH',
        auth: true,
        body,
      })
        .then(() => {
          setDrawerOpen(false);
          loadMonthPlans();
          loadPublicPlans();
        })
        .catch((e) => toastError(e, '更新计划失败'));
      return;
    }

    apiJson<{ plan: PlanItem }>('/api/plans', {
      method: 'POST',
      auth: true,
      body,
    })
      .then(() => {
        setDrawerOpen(false);
        loadMonthPlans();
        loadPublicPlans();
      })
      .catch((e) => toastError(e, '创建计划失败'));
  }


  function toggleDone(id: number, done: boolean) {
    apiJson<{ plan: PlanItem }>(`/api/plans/${id}`, { method: 'PATCH', body: { done }, auth: true })
      .then(() => {
        loadMonthPlans();
        loadPublicPlans();
      })
      .catch((e) => toastError(e, '更新失败'));
  }

  function removePlan(id: number) {
    apiJson<{ ok: true }>(`/api/plans/${id}`, { method: 'DELETE', auth: true })
      .then(() => {
        loadMonthPlans();
        loadPublicPlans();
      })
      .catch((e) => toastError(e, '删除失败'));
  }

  if (!token) {
    return (
      <Card bordered>
        <Typography.Title level="h4" className="!mb-1">
          计划打卡（云端）
        </Typography.Title>
        <Typography.Text className="text-slate-600">请先登录/注册。登录后计划会同步到云端，多端访问可见。</Typography.Text>
        <div className="mt-4">
          <Button theme="success" onClick={openAuth}>
            登录 / 注册
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3" bordered>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Typography.Title level="h4" className="!mb-0">
              {formatMonthTitle(month)}
            </Typography.Title>
            <Typography.Text className="text-slate-600">点击日期查看/编辑当天计划；可将计划设为公开，出现在全站动态中</Typography.Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Switch value={autoSync} onChange={(v) => setAutoSync(Boolean(v))} />
            <Typography.Text className="text-slate-600">实时同步</Typography.Text>
            <Button variant="outline" icon={<ChevronLeftIcon />} onClick={() => setMonth(addMonths(month, -1))}>
              上个月
            </Button>
            <Button variant="outline" icon={<ChevronRightIcon />} onClick={() => setMonth(addMonths(month, 1))}>
              下个月
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-sm font-medium text-slate-600">
              周{d}
            </div>
          ))}

          {monthGrid.map(({ date, inMonth }) => {
            const iso = toISODate(date);
            const stats = dayStats.get(iso);
            const isSelected = iso === selectedISO;
            const total = stats?.total ?? 0;
            const done = stats?.done ?? 0;
            const isToday = iso === todayISO;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedISO(iso)}
                className={[
                  'relative flex h-16 flex-col justify-between rounded-xl border p-2 text-left transition',
                  inMonth ? 'bg-white' : 'bg-slate-50',
                  isSelected ? 'border-ink-900 ring-2 ring-ink-900/10' : 'border-slate-200 hover:border-slate-300',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className={['text-sm font-semibold', inMonth ? 'text-ink-900' : 'text-slate-400'].join(' ')}>
                    {date.getDate()}
                  </span>
                  {isToday ? <span className="rounded-full bg-ink-900 px-2 py-0.5 text-xs text-white">今天</span> : null}
                </div>

                <div className="flex items-end justify-between">
                  {total > 0 ? (
                    <Badge
                      count={`${done}/${total}`}
                      color={done === total ? '#16A34A' : '#111827'}
                      showZero
                      size="small"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">无计划</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card bordered>
          <div className="flex items-start justify-between gap-2">
            <div>
              <Typography.Title level="h4" className="!mb-0">
                {selectedISO}
              </Typography.Title>
              <Typography.Text className="text-slate-600">
                完成：{selectedProgress.done}/{selectedProgress.total}
              </Typography.Text>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" icon={<RefreshIcon />} onClick={() => loadMonthPlans()}>
                刷新
              </Button>
              <Button theme="success" icon={<AddIcon />} onClick={openAddPlan}>
                添加计划
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {selectedPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                <Typography.Text className="text-slate-600">
                  这一天还没有计划。建议给自己一个很小但可完成的目标：比如“算法题 1 道 + 复盘 10 分钟”。
                </Typography.Text>
              </div>
            ) : null}

            {selectedPlans.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-start gap-2">
                      <Checkbox checked={p.done} onChange={(checked) => toggleDone(p.id, Boolean(checked))} />
                      <div className="min-w-0">
                        <Typography.Text
                          className={[p.done ? 'line-through text-slate-400' : 'text-ink-900', 'block'].join(' ')}
                        >
                          {p.title}
                        </Typography.Text>
                        <Typography.Text className="text-slate-600">
                          {p.category} · 约 {p.minutes} 分钟 · {p.public ? '公开' : '仅自己'}
                        </Typography.Text>
                      </div>
                    </div>
                    {p.notes ? <Typography.Text className="mt-2 block text-slate-600">备注：{p.notes}</Typography.Text> : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="outline" size="small" onClick={() => openEditPlan(p)}>
                      编辑
                    </Button>
                    <Button theme="danger" variant="text" onClick={() => removePlan(p.id)}>
                      删除
                    </Button>
                  </div>
                </div>
              </div>

            ))}
          </div>

          <Drawer
            header={editingId ? '编辑计划' : '添加当天学习计划'}
            visible={drawerOpen}
            size="460px"
            onClose={() => setDrawerOpen(false)}
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  取消
                </Button>
                <Button theme="success" onClick={savePlan}>
                  {editingId ? '保存更改' : '保存计划'}
                </Button>
              </div>
            }
          >

            <div className="space-y-4">
              <div>
                <Typography.Text className="mb-2 block text-slate-600">计划标题</Typography.Text>
                <Input value={draftTitle} onChange={(v) => setDraftTitle(String(v))} placeholder="例如：二分答案 + 相关题 2 道" clearable />
              </div>

              <div>
                <Typography.Text className="mb-2 block text-slate-600">学习方向</Typography.Text>
                <Select
                  value={draftCategory}
                  onChange={(v) => setDraftCategory(String(v))}
                  options={DEFAULT_CATEGORIES.map((c) => ({ label: c, value: c }))}
                />
              </div>

              <div>
                <Typography.Text className="mb-2 block text-slate-600">预计时长（分钟）</Typography.Text>
                <InputNumber value={draftMinutes} onChange={(v) => setDraftMinutes(Number(v))} min={5} step={5} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <Typography.Text className="block text-ink-900">公开到全站动态</Typography.Text>
                  <Typography.Text className="text-slate-600">勾选后，其他登录用户可在公开动态里看到该计划</Typography.Text>
                </div>
                <Switch value={draftPublic} onChange={(v) => setDraftPublic(Boolean(v))} />
              </div>

              <div>
                <Typography.Text className="mb-2 block text-slate-600">备注（可选）</Typography.Text>
                <Textarea
                  value={draftNotes}
                  onChange={(v) => setDraftNotes(String(v))}
                  autosize
                  placeholder="写下你打算怎么学，比如：先看知识点，再做题，再总结"
                />
              </div>
            </div>
          </Drawer>
        </Card>

        <Card bordered>
          <div className="flex items-center justify-between gap-2">
            <Typography.Title level="h5" className="!mb-0">
              全站公开动态（{selectedISO}）
            </Typography.Title>
            <Button variant="outline" icon={<RefreshIcon />} onClick={loadPublicPlans}>
              刷新
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {publicPlans.length === 0 ? (
              <Typography.Text className="text-slate-600">暂无公开计划。你可以在创建计划时打开“公开”。</Typography.Text>
            ) : null}

            {publicPlans.map((p) => (
              <div key={`pub_${p.id}`} className="rounded-xl border border-slate-200 bg-white p-3">
                <Typography.Text className="block text-slate-600">
                  @{p.owner} · {p.category} · {p.minutes} 分钟
                </Typography.Text>
                <Typography.Text className={['block', p.done ? 'line-through text-slate-400' : 'text-ink-900'].join(' ')}>
                  {p.title}
                </Typography.Text>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
