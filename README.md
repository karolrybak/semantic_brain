# Semantic brain

Set up your models paths in config.json in project root. You can use a single one if you want. Those must be models compatible with json grammar, best bet is to use qwen instruct.

Then

```
    bun install
```

You need to run both vite dev server and a specialized websocket server so in two separate terminals do:

```
    bun run dev
```

```
    bun run server
```

It might be possible to use node instead of bun, but it's untested

2. Json grammar support is a bit of hit & miss with node-llama-cpp If you're getting errors about missing createGrammarForJsonSchema function in the server output. You must recompile latest version from sources. Here's detailed instructions:
https://node-llama-cpp.withcat.ai/guide/building-from-source#download-new-release

Use latest release, then it should compile upon next start. If not use

```
bun run recompile
```

This will force recompilation. Use only once, afterward you can start server normally
