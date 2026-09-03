export function setIn<T extends Record<string, any>>(
  obj: T,
  path: string[],
  value: any
): T {
  if (path.length === 0) return value;
  const [key, ...restPath] = path;
  
  return {
    ...obj,
    [key]: restPath.length > 0 ? setIn(obj[key] || {}, restPath, value) : value,
  };
}

export function updateIn<T extends Record<string, any>>(
  obj: T,
  path: string[],
  updater: (val: any) => any
): T {
  if (path.length === 0) return updater(obj);
  const [key, ...restPath] = path;

  return {
    ...obj,
    [key]: restPath.length > 0 ? updateIn(obj[key] || {}, restPath, updater) : updater(obj[key]),
  };
}

export function deleteIn<T extends Record<string, any>>(
  obj: T,
  path: string[]
): T {
  if (path.length === 0) return obj;
  const [key, ...restPath] = path;

  if (restPath.length === 0) {
    const newObj = { ...obj };
    delete newObj[key];
    return newObj;
  }

  return {
    ...obj,
    [key]: deleteIn(obj[key] || {}, restPath),
  };
}