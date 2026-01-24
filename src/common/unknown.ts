/**
 * Sometimes we need to check the ambiguity response
 */
export const fetchPropFromUnknown = <T>(obj: unknown, prop: string, defaultVal: T): T => {
  // @ts-expect-error Sometimes we need this JS spice
  return obj && typeof obj === "object" && prop in obj ? obj[prop] : defaultVal;
};

export const unknownHasMessage = (obj: unknown): obj is { message: string } => {
  return (
    typeof obj === "object" && obj !== null && "message" in obj && typeof obj.message === "string"
  );
};

export const unknownHasText = (obj: unknown): obj is { text: string } => {
  return typeof obj === "object" && obj !== null && "text" in obj && typeof obj.text === "string";
};
