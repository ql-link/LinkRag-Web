/**
 * 登录/注册表单校验（纯函数）。由 welcome 桌面页与移动登录页共享，避免规则漂移。
 */

export type AuthMode = 'login' | 'register';
export type AuthFieldKey = 'username' | 'email' | 'password' | 'confirmPassword';

export interface AuthFormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** 必填项校验：返回每个缺失字段对应的内联错误提示。 */
export function buildRequiredFieldErrors(form: AuthFormState, mode: AuthMode): Partial<Record<AuthFieldKey, string>> {
  const nextFieldErrors: Partial<Record<AuthFieldKey, string>> = {};
  const username = form.username.trim();
  const email = form.email.trim();
  const password = form.password;
  const confirmPassword = form.confirmPassword;

  if (!username) {
    nextFieldErrors.username = '未填写用户名！';
  }

  if (!password) {
    nextFieldErrors.password = '未填写密码！';
  }

  if (mode === 'register') {
    if (!email) {
      nextFieldErrors.email = '未填写邮箱！';
    }
    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = '请确认密码！';
    }
  }

  return nextFieldErrors;
}

/** 业务规则校验（长度、邮箱格式、两次密码一致）：返回首个错误文案，校验通过返回 null。 */
export function validateAuthForm(form: AuthFormState, mode: AuthMode): string | null {
  const username = form.username.trim();
  const password = form.password;
  const email = form.email.trim();

  if (!username) {
    return '请输入用户名';
  }

  if (mode === 'register') {
    if (username.length < 3 || username.length > 64) {
      return '用户名长度需在 3 到 64 个字符之间';
    }
    if (!email) {
      return '请输入邮箱';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return '请输入正确的邮箱地址';
    }
    if (password.length < 6 || password.length > 128) {
      return '密码长度需在 6 到 128 个字符之间';
    }
    if (password !== form.confirmPassword) {
      return '两次输入的密码不一致';
    }
  }

  return null;
}
