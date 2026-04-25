const toJsonSafe = <T>(text: string): T | string => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return text;
  }
};

// 1. Overload: If a generic T is provided, toJson defaults to true and returns T
export async function getResponseErrorData<T>(
  response: Response,
  opts: { toJson: true },
): Promise<T | string>;

// 2. Overload: Default case (no generic provided), returns string
export async function getResponseErrorData(
  response: Response,
  opts?: { toJson?: false },
): Promise<string>;

// 3. Implementation
export async function getResponseErrorData<T = unknown>(
  response: Response,
  opts?: { toJson?: boolean },
): Promise<T | string> {
  try {
    const text = await response.text();
    if (opts?.toJson) {
      return toJsonSafe(text);
    }

    return text;
  } catch {
    return "no response";
  }
}
