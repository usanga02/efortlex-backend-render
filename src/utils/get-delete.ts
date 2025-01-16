import { Cache } from 'cache-manager';

const getDel = async (redis: Cache, keys: string[]) => {
  let newKeys: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const list = await redis.store.keys(keys[i]);
    newKeys = merge(newKeys, list);
  }

  if (newKeys.length > 0) await redis.del(newKeys as any);
};

function merge<T = any>(arr1: any[], arr2: any[]): T[] {
  const seen = new Set();

  const data = [...arr1, ...arr2];

  const result = data.filter((el) => {
    const duplicate = seen.has(el);
    seen.add(el);
    return !duplicate;
  });

  return result;
}

export default getDel;
