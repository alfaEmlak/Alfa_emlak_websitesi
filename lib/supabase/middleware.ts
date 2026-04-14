import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A common mistake is to assume the user is
  // authenticated just because a session cookie exists. The proper way
  // is to verify the session and get the user.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Admin route protection
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/karealfaadmin') &&
    !request.nextUrl.pathname.startsWith('/karealfaadmin/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/karealfaadmin'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() but forgot to update
  // the session cookies, you will not be able to call supabase.auth.getUser()
  // on the server side in your Server Components.
  return supabaseResponse
}
