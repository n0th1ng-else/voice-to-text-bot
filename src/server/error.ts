const toJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const getResponseErrorData = async (
  response: Response,
  opts?: { toJson: boolean },
): Promise<unknown> => {
  try {
    const text = await response.text();
    if (opts?.toJson) {
      return toJson(text);
    }

    return text;
  } catch {
    return "no response";
  }
};
