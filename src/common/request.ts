export const parseChunkedResponse = <Dto>(body = ""): Dto[] => {
  // Split by newline, trim, remove empty lines
  const chunks = body
    .split("\r\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => Boolean(chunk.length));

  // Loop through the chunks and try to Json.parse
  return chunks.reduce<{ prev: string; acc: Dto[] }>(
    ({ prev, acc }, chunk) => {
      const newPrev = `${prev}${chunk}`;
      try {
        const newChunk: Dto = JSON.parse(newPrev);
        return { prev: "", acc: [...acc, newChunk] };
      } catch {
        return { prev: newPrev, acc };
      }
    },
    { prev: "", acc: [] },
  ).acc;
};
