import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/auth/:path*', '/api/cars', '/api/generate', '/api/ocr', '/api/locations', '/api/cleanup'],
};
