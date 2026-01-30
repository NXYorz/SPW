import { useState } from 'react';
import { Button, Drawer, Input, MessagePlugin, Tabs, Typography } from 'tdesign-react';
import { LoginIcon, UserAddIcon } from 'tdesign-icons-react';
import { ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } from '../constants';
import { apiJson, setToken, toastError } from '../lib/api';
import type { User } from '../types';

type Mode = 'login' | 'register';

type AuthResponse = {
  token: string;
  user: User;
};

export function AuthDrawer(props: {
  visible: boolean;
  setVisible: (v: boolean) => void;
  onAuthed: (user: User) => void;
}) {
  const { visible, setVisible, onAuthed } = props;

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  function reset() {
    setUsername('');
    setPassword('');
    setPassword2('');
  }

  function close() {
    setVisible(false);
    reset();
    setMode('login');
  }

  function submitLogin() {
    apiJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    })
      .then((r) => {
        setToken(r.token);
        onAuthed(r.user);
        MessagePlugin.success(`欢迎回来，${r.user.username}`);
        close();
      })
      .catch((e) => toastError(e, '登录失败'));
  }

  function submitRegister() {
    if (password !== password2) {
      MessagePlugin.warning('两次密码不一致');
      return;
    }

    apiJson<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { username, password },
      auth: false,
    })
      .then((r) => {
        setToken(r.token);
        onAuthed(r.user);
        MessagePlugin.success(`注册成功，欢迎你：${r.user.username}`);
        close();
      })
      .catch((e) => toastError(e, '注册失败'));
  }

  return (
    <Drawer
      header="账号"
      visible={visible}
      size="460px"
      onClose={close}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            关闭
          </Button>
          {mode === 'login' ? (
            <Button theme="success" icon={<LoginIcon />} onClick={submitLogin}>
              登录
            </Button>
          ) : (
            <Button theme="success" icon={<UserAddIcon />} onClick={submitRegister}>
              注册
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <Typography.Text className="text-slate-700">
            普通用户注册后默认为“普通用户”。管理员请使用管理员账号登录后维护资料。
          </Typography.Text>
          <Typography.Text className="mt-2 block text-slate-600">
            管理员账号：<span className="font-semibold">{ADMIN_USERNAME}</span>，默认密码：
            <span className="font-semibold">{DEFAULT_ADMIN_PASSWORD}</span>
          </Typography.Text>
        </div>

        <Tabs value={mode} onChange={(v) => setMode(v as Mode)} theme="card">
          <Tabs.TabPanel value="login" label="登录">
            <div className="space-y-3">
              <div>
                <Typography.Text className="mb-2 block text-slate-600">用户名</Typography.Text>
                <Input value={username} onChange={(v) => setUsername(String(v))} clearable />
              </div>
              <div>
                <Typography.Text className="mb-2 block text-slate-600">密码</Typography.Text>
                <Input type="password" value={password} onChange={(v) => setPassword(String(v))} clearable />
              </div>
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="register" label="注册">
            <div className="space-y-3">
              <div>
                <Typography.Text className="mb-2 block text-slate-600">用户名（至少 2 个字符）</Typography.Text>
                <Input value={username} onChange={(v) => setUsername(String(v))} clearable />
              </div>
              <div>
                <Typography.Text className="mb-2 block text-slate-600">密码（至少 6 位）</Typography.Text>
                <Input type="password" value={password} onChange={(v) => setPassword(String(v))} clearable />
              </div>
              <div>
                <Typography.Text className="mb-2 block text-slate-600">确认密码</Typography.Text>
                <Input type="password" value={password2} onChange={(v) => setPassword2(String(v))} clearable />
              </div>
            </div>
          </Tabs.TabPanel>
        </Tabs>
      </div>
    </Drawer>
  );
}
