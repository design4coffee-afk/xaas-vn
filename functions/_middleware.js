import { getSessionAccount } from './_lib/helpers.js';

export async function onRequest(context) {
  const { request, env, next } = context;
  context.data.account = await getSessionAccount(request, env.DB);
  return next();
}
