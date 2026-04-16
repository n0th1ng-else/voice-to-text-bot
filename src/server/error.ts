const toJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const getResponseErrorData = async (
  response: Response,
  opts?: { raw: boolean },
): Promise<unknown> => {
  try {
    const text = await response.text();
    if (opts?.raw) {
      return text;
    }

    return toJson(text);
  } catch {
    return "no response";
  }
};
