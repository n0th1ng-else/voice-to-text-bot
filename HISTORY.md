### Typescript issues

First time I released my application, I bumped into the issue that it reached the memory limits.
Since I use free plans as much as possible it was a problem. Turns out `ts-node` consumes tons of RAM,
so I decided to compile all the code into JS. This allowed me to use 5 times less memory and live
under the 512mb limit (now it consumes ~100mb)
