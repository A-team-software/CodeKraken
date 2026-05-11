const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const envPath = path.join(appRoot, ".env");
const templatePath = path.join(appRoot, "manifest.yml.hbs");
const outputPath = path.join(appRoot, "manifest.yml");

function parseDotEnv(content) {
    const env = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }

        const eqIndex = line.indexOf("=");
        if (eqIndex === -1) {
            continue;
        }

        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        env[key] = value;
    }

    return env;
}

function loadEnv() {
    const env = { ...process.env };

    if (fs.existsSync(envPath)) {
        const parsed = parseDotEnv(fs.readFileSync(envPath, "utf8"));
        Object.assign(env, parsed);
    }

    return env;
}

function main() {
    if (!fs.existsSync(templatePath)) {
        throw new Error("manifest.yml.hbs not found");
    }

    const env = loadEnv();
    const serverRemoteUrl = env.SERVER_REMOTE_URL;

    if (!serverRemoteUrl) {
        throw new Error(
            "SERVER_REMOTE_URL is missing. Set it in apps/JiraForge/.env before running build."
        );
    }

    const template = fs.readFileSync(templatePath, "utf8");
    const manifest = template.replace(/{{\s*SERVER_REMOTE_URL\s*}}/g, serverRemoteUrl);

    fs.writeFileSync(outputPath, manifest, "utf8");
    console.log(`Generated ${path.relative(appRoot, outputPath)} from manifest.yml.hbs`);
}

main();
