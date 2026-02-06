import { useEffect, useMemo, useState} from 'react';
import { Button, Card, Drawer, Input, Link, Select, Tag, Textarea, Typography } from 'tdesign-react';

import { AddIcon, SearchIcon } from 'tdesign-icons-react';
import { DEFAULT_CATEGORIES, RESOURCE_TYPES } from '../constants';
import { apiJson, toastError } from '../lib/api';
import type { ResourceItem, ResourceType, TechCategory } from '../types';

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function ResourcesTab(props: {
  token: string | null;
  openAuth: () => void;
  isAdmin: boolean;
}) {
  const { token, openAuth, isAdmin } = props;

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<TechCategory | '全部'>('全部');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<TechCategory>(DEFAULT_CATEGORIES[0]);
  const [draftType, setDraftType] = useState<ResourceType>('文章');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftTags, setDraftTags] = useState('');


  

  useEffect(() => {
    apiJson<{ resources: ResourceItem[] }>('/api/resources', { auth: false })
      .then((r) => setResources(r.resources))
      .catch((e) => toastError(e, '获取资料失败'));
  }, []);

  const filtered = useMemo(() => {
    const kw = norm(keyword);
    return resources
      .filter((r) => (category === '全部' ? true : r.category === category))
      .filter((r) => {
        if (!kw) return true;
        const hay = norm([r.title, r.category, r.type, r.summary, r.tags.join(' ')].join(' '));
        return hay.includes(kw);
      })
      .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
  }, [resources, keyword, category]);

  const categoriesForFilter = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const r of resources) set.add(r.category);
    return ['全部', ...Array.from(set)] as Array<TechCategory | '全部'>;
  }, [resources]);

  function reload() {
    apiJson<{ resources: ResourceItem[] }>('/api/resources', { auth: false })
      .then((r) => setResources(r.resources))
      .catch((e) => toastError(e, '获取资料失败'));
  }

  function openCreate() {
    if (!isAdmin) return;
    setEditingId(null);
    setDraftTitle('');
    setDraftCategory(DEFAULT_CATEGORIES[0]);
    setDraftType('文章');
    setDraftUrl('');
    setDraftSummary('');
    setDraftTags('');
    setDrawerOpen(true);
  }

  function openEdit(item: ResourceItem) {
    setEditingId(item.id);
    setDraftTitle(item.title);
    setDraftCategory(item.category);
    setDraftType(item.type);
    setDraftUrl(item.url);
    setDraftSummary(item.summary);
    setDraftTags(item.tags.join(', '));
    setDrawerOpen(true);
  }

  function remove(id: number) {
    apiJson<{ ok: true }>(`/api/resources/${id}`, { method: 'DELETE', auth: true })
      .then(() => reload())
      .catch((e) => toastError(e, '删除失败'));
  }

  function save() {
    const title = draftTitle.trim();
    const url = draftUrl.trim();
    const summary = draftSummary.trim();
    if (!title || !url || !summary) return;

    const tags = draftTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    const payload = {
      title,
      category: draftCategory,
      type: draftType,
      url,
      summary,
      tags,
    };

    if (editingId) {
      apiJson<{ resource: ResourceItem }>(`/api/resources/${editingId}`, { method: 'PATCH', body: payload, auth: true })
        .then(() => {
          setDrawerOpen(false);
          reload();
        })
        .catch((e) => toastError(e, '保存失败'));
      return;
    }

    apiJson<{ resource: ResourceItem }>('/api/resources', { method: 'POST', body: payload, auth: true })
      .then(() => {
        setDrawerOpen(false);
        reload();
      })
      .catch((e) => toastError(e, '保存失败'));
  }

  return (
    <div className="space-y-4">
      <Card bordered>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Typography.Title level="h4" className="!mb-0">
              学习资料库（云端）
            </Typography.Title>
            <Typography.Text className="text-slate-600">管理员维护后，所有访问者都会看到同一份资料。</Typography.Text>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-60">
              <Input
                value={keyword}
                onChange={(v) => setKeyword(String(v))}
                prefixIcon={<SearchIcon />}
                clearable
                placeholder="搜：标题 / 标签 / 摘要"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                value={category}
                onChange={(v) => setCategory((v as TechCategory | '全部') ?? '全部')}
                options={categoriesForFilter.map((c) => ({ label: c, value: c }))}
              />
            </div>

            {!token ? (
              <Button theme="success" onClick={openAuth}>
                登录后可管理
              </Button>
            ) : (
              <Button theme="success" icon={<AddIcon />} disabled={!isAdmin} onClick={openCreate}>
                添加资料
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((r) => (
          <Card key={r.id} bordered className="h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Typography.Title level="h5" className="!mb-1 !truncate">
                  {r.title}
                </Typography.Title>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag>{r.category}</Tag>
                  <Tag theme="success" variant="outline">
                    {r.type}
                  </Tag>
                </div>
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-1">
                  <Button size="small" variant="outline" onClick={() => openEdit(r)}>
                    编辑
                  </Button>
                  <Button size="small" theme="danger" variant="outline" onClick={() => remove(r.id)}>
                    删除
                  </Button>
                </div>
              ) : null}
            </div>

            <Typography.Paragraph className="!mt-3 !mb-3 text-slate-700" ellipsis>
              {r.summary}
            </Typography.Paragraph>

            <div className="flex flex-wrap gap-2">
              {r.tags.map((t) => (
                <Tag key={t} variant="outline">
                  {t}
                </Tag>
              ))}
            </div>

            <div className="mt-4">
              <Link href={r.url} target="_blank">
                打开链接
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Drawer
        header={editingId ? '编辑资料' : '添加资料'}
        visible={drawerOpen}
        size="520px"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button theme="success" onClick={save}>
              保存
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Typography.Text className="mb-2 block text-slate-600">标题</Typography.Text>
            <Input value={draftTitle} onChange={(v) => setDraftTitle(String(v))} clearable />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Typography.Text className="mb-2 block text-slate-600">方向</Typography.Text>
              <Select
                value={draftCategory}
                onChange={(v) => setDraftCategory(String(v))}
                options={DEFAULT_CATEGORIES.map((c) => ({ label: c, value: c }))}
              />
            </div>
            <div>
              <Typography.Text className="mb-2 block text-slate-600">类型</Typography.Text>
              <Select
                value={draftType}
                onChange={(v) => setDraftType(v as ResourceType)}
                options={RESOURCE_TYPES.map((t) => ({ label: t, value: t }))}
              />
            </div>
          </div>

          <div>
            <Typography.Text className="mb-2 block text-slate-600">链接</Typography.Text>
            <Input value={draftUrl} onChange={(v) => setDraftUrl(String(v))} clearable placeholder="https://..." />
          </div>

          <div>
            <Typography.Text className="mb-2 block text-slate-600">摘要（建议写清楚：学什么/适合谁/建议怎么学）</Typography.Text>
            <Textarea value={draftSummary} onChange={(v) => setDraftSummary(String(v))}  rows = {1} autosize/>
          </div>

          <div>
            <Typography.Text className="mb-2 block text-slate-600">标签（逗号分隔，最多 8 个）</Typography.Text>
            <Input value={draftTags} onChange={(v) => setDraftTags(String(v))} clearable placeholder="例如：索引, 执行计划, 事务" />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
