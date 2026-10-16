import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PAGES = ['/login', '/register', '/forgot-password'] // người đã đăng nhập vào đây thì chuyển về /dashboard
const PUBLIC = ['/', ...AUTH_PAGES]       // ai cũng xem được (trang giới thiệu + đăng nhập/đăng ký)

/** Làm mới phiên đăng nhập và chuyển hướng: chưa đăng nhập → /login, đã đăng nhập mà vào /login → /dashboard.
 *  Đây chỉ là kiểm tra nhanh; quyền thật do RLS ở database quyết định. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data } = await supabase.auth.getClaims() // kiểm tra chữ ký JWT, không cần gọi mạng khi dùng khóa bất đối xứng
  const user = data?.claims ?? null
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC.includes(path)

  const redirect = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url))
    response.cookies.getAll().forEach((c) => r.cookies.set(c))
    return r
  }
  if (!user && !isPublic) return redirect('/login')
  if (user && (AUTH_PAGES.includes(path) || path === '/')) return redirect('/dashboard')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
