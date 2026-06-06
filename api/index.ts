import app from '../server';

// Lightweight bridge for Vercel's Node runtime.
// Vercel provides Node's `req` and `res` objects which are compatible with Express.
export default function handler(req: any, res: any) {
	return app(req, res);
}
