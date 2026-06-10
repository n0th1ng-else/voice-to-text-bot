await new Promise((resolve) => {
  setTimeout(resolve, 1_00);
});

// Duration  2.65s (transform 2.20s, setup 4.15s, import 7.17s, tests 5.65s, environment 2ms)
// Duration  4.90s (transform 0ms, setup 4.39s, import 18.76s, tests 5.59s, environment 3ms)
