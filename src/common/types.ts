export type Prettify<T> = {
  [key in keyof T]: T[key];
};
