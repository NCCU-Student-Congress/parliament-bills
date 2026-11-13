import { readCurrentSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const session = await readCurrentSession(event);

  if (!session) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    userId: session.userId,
    email: session.email,
    role: session.role,
  };
});
