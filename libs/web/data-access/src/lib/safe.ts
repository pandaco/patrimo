export function safeValue<T>(resource: { value: () => T | undefined }, fallback: T): T {
  try {
    const val = resource.value();
    return val !== undefined && val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

export function safeValueOrUndefined<T>(resource: { value: () => T | undefined }): T | undefined {
  try {
    return resource.value();
  } catch {
    return undefined;
  }
}
