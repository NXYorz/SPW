import { useState } from 'react';

import { Button, Card, Divider, Input, MessagePlugin, Typography } from 'tdesign-react';
import { SettingIcon } from 'tdesign-icons-react';
import type { User } from '../types';
import { apiJson, toastError } from '../lib/api';

export function AdminTab(props: {
  currentUser: User | null;
  openAuth: () => void;
}) {
  const { currentUser, openAuth } = props;
  const isAdmin = currentUser?.role === 'admin';

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  function changePassword() {
    apiJson<{ ok: true }>('/api/users/me/password', {
      method: 'PATCH',
      body: { oldPassword, newPassword },
      auth: true,
    })
      .then(() => {
        setOldPassword('');
        setNewPassword('');
        MessagePlugin.success('密码已更新（云端生效）');
      })
      .catch((e) => toastError(e, '修改密码失败'));
  }

  return (
    <div className="space-y-4">
      <Card bordered>
        <Typography.Title level="h4" className="!mb-1">
          管理员中心
        </Typography.Title>
        <Typography.Text className="text-slate-600">用于维护学习资料库与全站数据（云端同步）。</Typography.Text>

        <Divider className="!my-4" />

        {!currentUser ? (
          <div className="space-y-3">
            <Typography.Text className="text-slate-700">你当前是游客，请先登录/注册。</Typography.Text>
            <Button theme="success" onClick={openAuth}>
              登录 / 注册
            </Button>
          </div>
        ) : !isAdmin ? (
          <div className="space-y-3">
            <Typography.Text className="text-slate-700">
              当前账号：<span className="font-semibold">{currentUser.username}</span>（普通用户）。
            </Typography.Text>
            <Typography.Text className="text-slate-600">普通用户无法维护资料条目。</Typography.Text>
            <Button variant="outline" onClick={openAuth}>
              切换账号
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Typography.Text className="text-slate-700">
              你已使用管理员账号 <span className="font-semibold">{currentUser.username}</span> 登录。
            </Typography.Text>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Typography.Text className="mb-2 block text-slate-600">旧密码</Typography.Text>
                <Input type="password" value={oldPassword} onChange={(v) => setOldPassword(String(v))} clearable />
              </div>
              <div>
                <Typography.Text className="mb-2 block text-slate-600">新密码（至少 6 位）</Typography.Text>
                <Input type="password" value={newPassword} onChange={(v) => setNewPassword(String(v))} clearable />
              </div>
            </div>

            <div className="flex justify-end">
              <Button theme="primary" icon={<SettingIcon />} onClick={changePassword}>
                修改密码
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card bordered>
        <Typography.Title level="h5" className="!mb-2">
          提示
        </Typography.Title>
        <ul className="list-disc space-y-2 pl-6 text-slate-700">
          <li>云端模式下，所有登录用户的数据都保存在数据库中。</li>
          <li>如果你希望“所有计划默认对全站可见”，可以在计划创建时勾选“公开”。</li>
        </ul>
      </Card>
    </div>
  );
}
