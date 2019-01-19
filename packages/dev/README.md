# @exstatic/dev

Programmatic API for @exstatic/cli

Exports an extended version of @exstatic/core with support for things like:

 - destroy: remove event listeners so you can instantiate a new instance of ExstaticDev
 - watch: rebuild source files when they change
 - build: build source files and write to output directory
 - Events: every instance supports emitting events. This might be pushed downstream to @exstatic/core if needed
