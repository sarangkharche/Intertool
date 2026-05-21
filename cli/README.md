# Intertool CLI

Command-line client for Intertool registries.

```bash
cd cli
npm install
npm run build
npm link
intertool login --url https://your-registry.example.com
intertool search "code review"
intertool install @team/code-review
```

After the package is published to npm, install with `npm install -g intertool`.

Use `intertool --help` for the full command list.
