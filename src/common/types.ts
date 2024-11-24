export type Prettify<T> = {
  [key in keyof T]: T[key];
};

export type VoidPromise = () => Promise<void>;

export type ValueOf<T> = T[keyof T];
