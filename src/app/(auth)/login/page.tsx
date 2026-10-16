import { headers } from 'next/headers'
import { LoginForm, type TestAccount } from './LoginForm'

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

/** Tài khoản thử chỉ được đưa xuống trình duyệt khi: đang chạy trên host local VÀ (dev server hoặc bật SHOW_TEST_LOGINS=1)
 *  VÀ có TEST_PASSWORD. Trên môi trường triển khai thật (host khác, NODE_ENV=production) mật khẩu không bao giờ rời server. */
async function getTestAccounts(): Promise<TestAccount[] | undefined> {
  const host = (await headers()).get('host') ?? ''
  const password = process.env.TEST_PASSWORD
  const enabled = process.env.NODE_ENV === 'development' || process.env.SHOW_TEST_LOGINS === '1'
  if (!password || !enabled || !LOCAL_HOST.test(host)) return undefined
  return [
    { label: 'Trung tâm test', note: 'chủ trung tâm', email: 'center.test@example.com', password },
    { label: 'Giáo viên test', note: 'giáo viên của trung tâm', email: 'gv.test@example.com', password },
    { label: 'Giáo viên cá nhân test', note: 'tổ chức riêng 1 người', email: 'solo.test@example.com', password },
  ]
}

export default async function LoginPage() {
  return <LoginForm testAccounts={await getTestAccounts()} />
}
