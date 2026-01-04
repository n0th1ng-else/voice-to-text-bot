const getResponseErrorRawData = async (response: Response): Promise<string | undefined> => {
  try {
    const data = await response.text();
    return data;
  } catch {
    return;
  }
};

export const getResponseErrorData = async (response: Response): Promise<unknown> => {
  try {
    const data = await response.json();
    return data;
  } catch {
    const data = await getResponseErrorRawData(response);
    return data;
  }
};

export const unknownHasMessage = (obj: unknown): obj is { message: string } => {
  return (
    typeof obj === "object" && obj !== null && "message" in obj && typeof obj.message === "string"
  );
};
