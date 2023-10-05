export const getHostDomain = (url: string): string => {
  const urlParts = url.split(".");
  if (urlParts.length < 3) {
    return url;
  }
  return ["***", urlParts.at(-2), urlParts.at(-1)].join(".");
};
