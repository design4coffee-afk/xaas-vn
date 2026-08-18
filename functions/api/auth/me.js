import { json, unauthorized } from '../../_lib/helpers.js';

export async function onRequestGet({ data }) {
  if (!data.account) return unauthorized();
  return json(data.account);
}
