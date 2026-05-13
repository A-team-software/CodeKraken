# OliverAI Jira Assistant

This project contains a Forge app written in Javascript that lets you invoke OliverAI from Jira to resolve coding tasks for the current issue.

See [developer.atlassian.com/platform/forge/](https://developer.atlassian.com/platform/forge) for documentation and tutorials explaining Forge.

## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start

- Install top-level dependencies:
```
npm install
```

- Install dependencies inside of the `static/jira` directory:
```
pnpm --prefix static/jira install
```

- Modify your app by editing the files in `static/jira/ui/`.

- Build your app:
```
pnpm run build
```
```
forge deploy
```

- Install your app in an Atlassian site by running:
```
forge install
```

- Develop your app by running `forge tunnel` to proxy invocations locally:
```
forge tunnel
```

## Local Forge UI

Use one command to run Forge tunnel and a Custom UI dev server with live refresh:

```bash
pnpm --filter jira-command-custom-ui run dev
```

`dev` auto-generates `manifest.yml` and uses this default backend URL when
`SERVER_REMOTE_URL` is not already set:

```bash
https://oliver-server-qw6b.vercel.app
```

To override it for local/server-specific testing:

```bash
SERVER_REMOTE_URL=https://your-server.example pnpm --filter jira-command-custom-ui run dev
```

Before first tunnel in a new environment:

```bash
pnpm --filter jira-command-custom-ui run manifest:generate
forge deploy -e development
```

Port mapping:

| Purpose | Port |
|---|---:|
| Forge tunnel | handled by `forge tunnel` |
| UI builder (`vite build --watch`) | local build watcher |

Troubleshooting when UI does not update:

- Confirm `forge tunnel` is running in the `dev` command output.
- Confirm the app is installed from the same Forge environment you deployed.
- Re-run `manifest:generate` and `forge deploy -e <env>` after manifest tunnel changes.
- Verify your Atlassian site is opening the app from that dev environment.

### Notes
- Use the `forge deploy` command when you want to persist code changes.
- Use the `forge install` command when you want to install the app on a new site.
- Once the app is installed on a site, the site picks up the new app changes you deploy without needing to rerun the install command.

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.
